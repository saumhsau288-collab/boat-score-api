#!/usr/bin/env python3
"""Read official BOATRACE fan handbook fixed-width bytes, without retaining personal profile fields."""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path

SOURCE = "https://www.boatrace.jp/static_extra/pc_static/download/data/kibetsu/fan2610.lzh"
LAYOUT = "https://www.boatrace.jp/owpc/pc/extra/data/layout.html"
# Official post-2014 layout: header 82 bytes; 6 x 13 course bytes;
# preceding class/index/period metadata 38 bytes; 6 x 34 finish/incident bytes;
# final no-course incidents 8 bytes and birthplace 6 bytes.
WIDTH = 416
COURSE_OFFSET = 82
PERIOD_OFFSET = 174
FINISH_OFFSET = 198

def digits(value):
    if not value or not value.isdigit():
        raise ValueError("non-numeric field")
    return int(value)

def date_field(value):
    text = value.decode("ascii")
    return dt.datetime.strptime(text, "%Y%m%d").date()

def parse_row(raw):
    if len(raw) != WIDTH:
        raise ValueError(f"unexpected row length {len(raw)}")
    reg = digits(raw[:4])
    if not 1000 <= reg <= 9999:
        raise ValueError("invalid registration")
    year = digits(raw[PERIOD_OFFSET:PERIOD_OFFSET + 4])
    term = digits(raw[PERIOD_OFFSET + 4:PERIOD_OFFSET + 5])
    start = date_field(raw[179:187])
    end = date_field(raw[187:195])
    if (year, term) != (2027, 1) or start > end or end >= dt.date(2026, 11, 26):
        raise ValueError("unexpected or future source period")
    courses = []
    for i in range(6):
        a = COURSE_OFFSET + i * 13
        b = FINISH_OFFSET + i * 34
        entries = digits(raw[a:a+3])
        counts = [digits(raw[b+j*3:b+(j+1)*3]) for j in range(6)]
        incidents = [digits(raw[b+18+j*2:b+20+j*2]) for j in range(8)]
        normal = sum(counts)
        # Do not assume that the official entry denominator and normal finishes
        # agree. Store counts; define rates among normal finishes explicitly.
        valid = normal <= entries
        rates = [round(100 * n / normal, 4) for n in counts[:3]] if valid and normal else None
        courses.append({"course": i+1, "entries": entries, "normalFinishes": normal,
                        "finishCounts": counts, "incidentCounts": dict(zip(
                            ["F","L0","L1","K0","K1","S0","S1","S2"], incidents)),
                        "normalFinishRates123": rates,
                        "status": "count_mismatch" if not valid else "no_normal_finish" if not normal else "available"})
    return str(reg), start.isoformat(), end.isoformat(), courses

def parse_file(data):
    rows = data.split(b"\n")
    if rows and rows[-1] == b"":
        rows.pop()
    records = {}
    period = None
    for i, line in enumerate(rows, 1):
        try:
            reg, start, end, courses = parse_row(line.removesuffix(b"\r"))
            if reg in records:
                raise ValueError("duplicate registration")
            if period is not None and period != (start, end):
                raise ValueError("mixed source periods")
            period = (start, end)
            records[reg] = courses
        except ValueError as e:
            raise ValueError(f"line {i}: {e}") from e
    if not 1000 <= len(records) <= 3000:
        raise ValueError(f"unexpected racer count {len(records)}")
    return {"schema":1, "source":SOURCE, "layout":LAYOUT, "sourceYear":2027,
            "sourceTerm":1, "periodStart":period[0], "periodEnd":period[1],
            "sourceTextSha256":hashlib.sha256(data).hexdigest(),
            "rateDefinition":"exact finishing position count / sum of normal 1-6 finishes; not an official displayed percentage",
            "racerCount":len(records), "racers":records}

def self_test():
    def row(reg=3415):
        data = bytearray(b"0"*WIDTH)
        data[:4] = str(reg).encode()
        data[174:195] = b"202712026050120261031"
        for i in range(6):
            a = COURSE_OFFSET+i*13
            b = FINISH_OFFSET+i*34
            data[a:a+3] = b"010"
            data[b:b+18] = b"003002001002001001"
        return data
    raw = row()
    reg,start,end,courses = parse_row(raw)
    assert reg == "3415" and start == "2026-05-01" and end == "2026-10-31"
    assert courses[0]["normalFinishRates123"] == [30.0,20.0,10.0]
    raw[82:85] = b"001"
    assert parse_row(raw)[3][0]["status"] == "count_mismatch"
    assert parse_row(raw)[3][0]["normalFinishRates123"] is None
    raw[82:85] = b"000"
    raw[198:216] = b"000000000000000000"
    assert parse_row(raw)[3][0]["status"] == "no_normal_finish"
    try:
        parse_row(raw[:-1])
        raise AssertionError("short record accepted")
    except ValueError:
        pass
    try:
        parse_file(bytes(row())+b"\r\n"+bytes(row())+b"\r\n")
        raise AssertionError("duplicate accepted")
    except ValueError as e:
        assert "duplicate" in str(e)
    print("Official course count parser: byte offsets, exact finish rates, zero samples, mismatches and duplicate guards passed.")

if __name__ == "__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--self-test",action="store_true")
    p.add_argument("--input",type=Path)
    p.add_argument("--output",type=Path)
    args=p.parse_args()
    if args.self_test:
        self_test()
    else:
        if not args.input or not args.output:
            p.error("--input and --output required")
        data=parse_file(args.input.read_bytes())
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
        print(json.dumps({k:v for k,v in data.items() if k!="racers"},ensure_ascii=False))
        print("COURSE_COVERAGE",json.dumps({status:sum(c["status"]==status for rows in data["racers"].values() for c in rows) for status in ["available","no_normal_finish","count_mismatch"]}))
