#!/usr/bin/env python3
"""Extract a real verified official B/K race for retrospective offline evidence only."""
import argparse,json
from pathlib import Path
from run_offline_race_evidence import run

def extract(report,venue,race):
    matches=[r for block in report.get('reports',[]) for r in block.get('records',[])
             if r.get('venue')==venue and r.get('race')==race]
    if len(matches)!=1:raise ValueError('Expected exactly one official matched race')
    row=matches[0]
    if row.get('resultVerified') is not True:raise ValueError('Official result unverified')
    racers=row.get('racers')
    if not isinstance(racers,list) or len(racers)!=6 or {r.get('boat') for r in racers}!=set(range(1,7)):
        raise ValueError('Invalid six-racer official record')
    return {'date':row['date'],'venue':venue,'race':race,'racers':racers}

def retrospective(report,history,venue,race):
    source=extract(report,venue,race)
    result=run(source,history)
    result['inputTiming']='POST_RACE_OFFICIAL_ARCHIVE_NOT_PRE_RACE'
    result['retrospectiveOnly']=True
    result['actualDeployedPredictionVerified']=False
    result['accuracyCalculationPermitted']=False
    result['warning']+=' Official B/K archive is retrospective; race result must not leak into claimed pre-race prediction.'
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--official-report',required=True)
    p.add_argument('--history',required=True)
    p.add_argument('--venue',type=int,required=True)
    p.add_argument('--race',type=int,required=True)
    p.add_argument('--output',required=True)
    a=p.parse_args()
    if not 1<=a.venue<=24 or not 1<=a.race<=12:raise SystemExit('Invalid venue or race')
    result=retrospective(json.loads(Path(a.official_report).read_text(encoding='utf-8')),
       json.loads(Path(a.history).read_text(encoding='utf-8')),a.venue,a.race)
    out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'date':result['date'],'venue':a.venue,'race':a.race,'retrospectiveOnly':True,
                      'racerCount':len(result['racers'])},ensure_ascii=False))
