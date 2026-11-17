#!/usr/bin/env python3
"""Validate downloaded official B/K daily LZH archive headers without inventing parsed race data."""
import argparse
import datetime as dt
import json
from pathlib import Path

def inspect_archive(path):
    p=Path(path)
    if not p.is_file():
        return {"status":"missing"}
    b=p.read_bytes()
    # LHA level-0/1 header: byte 0 header size, bytes 2..6 method '-lhN-'.
    if len(b)<24 or b[0]<20 or not (b[2:7].startswith(b"-lh") and b[6:7]==b"-"):
        return {"status":"invalid_lzh_header","bytes":len(b)}
    return {"status":"header_verified","bytes":len(b),"method":b[2:7].decode("ascii","replace"),
            "note":"Header only: entrants, metrics and results have NOT been decoded or verified"}

def audit(root,start,end):
    a=dt.date.fromisoformat(start);z=dt.date.fromisoformat(end)
    if z<a or (z-a).days>=31:raise ValueError("Date range must be 1-31 days")
    out=[]
    for offset in range((z-a).days+1):
        day=a+dt.timedelta(days=offset)
        for kind in ("B","K"):
            p=Path(root)/kind/f"{kind.lower()}{day:%y%m%d}.lzh"
            out.append({"date":day.isoformat(),"kind":kind,**inspect_archive(p)})
    return {"archiveChecks":out,"headerVerified":sum(x["status"]=="header_verified" for x in out),
            "total":len(out),"verifiedPreRaceSnapshots":0,
            "weightCalibrationReady":False,
            "warning":"Archive header verification is not historical racer metric extraction."}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",default="data/raw");p.add_argument("--start",required=True);p.add_argument("--end",required=True)
    p.add_argument("--output",default="data/raw/archive-audit.json")
    args=p.parse_args()
    report=audit(args.root,args.start,args.end)
    dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=="__main__":main()
