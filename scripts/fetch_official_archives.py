#!/usr/bin/env python3
"""Download official BOAT RACE daily B/K archives, without guessing parsed results.

Usage: python3 scripts/fetch_official_archives.py --start 2026-11-01 --end 2026-11-02
Downloads are raw LZH files; decoding and matching entrants/results is a separate step.
"""
import argparse
import datetime as dt
import json
import pathlib
import urllib.error
import urllib.request

def date_value(value):
    return dt.datetime.strptime(value, "%Y-%m-%d").date()

def archive_url(day, kind):
    assert kind in ("B", "K")
    return f"https://www1.mbrace.or.jp/od2/{kind}/{day:%Y%m}/{kind.lower()}{day:%y%m%d}.lzh"

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--start",type=date_value,required=True)
    p.add_argument("--end",type=date_value,required=True)
    p.add_argument("--out",default="data/raw")
    p.add_argument("--max-days",type=int,default=7)
    args=p.parse_args()
    days=(args.end-args.start).days+1
    if days<1 or days>args.max_days or args.max_days>31:
        p.error("Date range must be positive and <= max-days (maximum 31); backfill in batches")
    out=pathlib.Path(args.out)
    report=[]
    for offset in range(days):
        day=args.start+dt.timedelta(days=offset)
        for kind in ("B","K"):
            dest=out/kind/f"{kind.lower()}{day:%y%m%d}.lzh"
            url=archive_url(day,kind)
            item={"date":day.isoformat(),"kind":kind,"url":url}
            if dest.is_file() and dest.stat().st_size>0:
                item["status"]="cached"
            else:
                dest.parent.mkdir(parents=True,exist_ok=True)
                temp=dest.with_suffix(".part")
                try:
                    req=urllib.request.Request(url,headers={"User-Agent":"BoatScore2-HistoricalResearch/1.0"})
                    with urllib.request.urlopen(req,timeout=20) as response:
                        if response.status!=200: raise ValueError(f"HTTP {response.status}")
                        payload=response.read(8_000_001)
                    if not payload or len(payload)>8_000_000: raise ValueError("empty or oversized response")
                    temp.write_bytes(payload)
                    temp.replace(dest)
                    item["status"]="downloaded"
                    item["bytes"]=len(payload)
                except (OSError,urllib.error.URLError,ValueError) as e:
                    temp.unlink(missing_ok=True)
                    item["status"]="failed"
                    item["error"]=str(e)[:180]
            report.append(item)
            print(f"{item['date']} {kind}: {item['status']}",flush=True)
    out.mkdir(parents=True,exist_ok=True)
    (out/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"requested":len(report),"failed":sum(x["status"]=="failed" for x in report)},ensure_ascii=False))

if __name__=="__main__":main()
