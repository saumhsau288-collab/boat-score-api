#!/usr/bin/env python3
"""Inspect decompressed official B/K text, without asserting a field layout."""
import argparse, hashlib, json, pathlib, re
def inspect(path,limit=12):
    p=pathlib.Path(path)
    raw=p.read_bytes()
    if not raw or len(raw)>5_000_000: raise ValueError("empty or oversized decoded archive")
    candidates=[]
    for enc in ("cp932","shift_jis","utf-8"):
        try:
            value=raw.decode(enc)
            if "\ufffd" not in value:
                candidates.append((enc,value))
        except UnicodeDecodeError: pass
    if not candidates:return {"file":p.name,"status":"unknown_encoding","sha256":hashlib.sha256(raw).hexdigest()}
    enc,value=candidates[0]
    lines=value.splitlines()
    preview=[re.sub(r"[\x00-\x1f\x7f]"," ",x)[:180] for x in lines[:limit]]
    return {"file":p.name,"status":"decoded_text_preview","encoding":enc,"bytes":len(raw),
      "sha256":hashlib.sha256(raw).hexdigest(),"lineCount":len(lines),
      "firstLines":preview,"parsedRaces":0,"verifiedRacerMetrics":0,
      "warning":"Preview only: no field offsets or historical point-in-time verification"}
def main():
    a=argparse.ArgumentParser();a.add_argument("files",nargs="+");a.add_argument("--output",required=True)
    x=a.parse_args();result={"files":[inspect(f) for f in x.files],"calibrationReady":False}
    p=pathlib.Path(x.output);p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=="__main__":main()
