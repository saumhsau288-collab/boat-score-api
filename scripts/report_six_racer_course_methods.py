#!/usr/bin/env python3
"""Read-only six-racer course and winning-method evidence, not prediction or weight adjustment."""
import argparse,json
from pathlib import Path
METHODS=('逃げ','差し','まくり','まくり差し','抜き','恵まれ')
def report(history,racers):
    if history.get('scope')!='OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION':
        raise ValueError('Historical evidence scope mismatch')
    if len(racers)!=6 or {r.get('boat') for r in racers}!=set(range(1,7)) or len({str(r.get('racerId')) for r in racers})!=6:
        raise ValueError('Require six distinct boat and racer IDs')
    evidence={str(r['racerId']):r for r in history.get('racerEvidence',[])}
    output=[]
    for racer in sorted(racers,key=lambda r:r['boat']):
        row=evidence.get(str(racer['racerId']))
        if row is None:
            output.append({'boat':racer['boat'],'racerId':str(racer['racerId']),
              'status':'no_verified_historical_sample','observedStarts':0,'observedWins':0,
              'winningMethodSharesOfWinsPercent':None,'entryCourseWinRatesPercent':None})
            continue
        starts=row['observedStarts'];wins=row['observedWins']
        eligible=starts>=20 and wins>=5
        course_rates=None
        if eligible:
            course_rates={}
            for course,stats in row.get('entryCourses',{}).items():
                n=stats['starts']
                # Require an independent minimum per-course sample to show descriptive course win rates.
                course_rates[course]={'observedStarts':n,'observedWins':stats['first'],
                  'observedWinRatePercent':round(stats['first']/n*100,2) if n>=10 else None,
                  'sampleSufficientForCourseRate':n>=10,
                  'winningMethodsOfCourseWins':{m:stats.get('winningMethods',{}).get(m,0) for m in METHODS}}
        output.append({'boat':racer['boat'],'racerId':str(racer['racerId']),
          'status':'descriptive_sample_available' if eligible else 'insufficient_sample',
          'observedStarts':starts,'observedWins':wins,
          'winningMethodSharesOfWinsPercent':row.get('winningMethodSharesOfWinsPercent') if eligible else None,
          'entryCourseWinRatesPercent':course_rates})
    return {'scope':'OFFLINE_HISTORICAL_COURSE_METHOD_EVIDENCE',
      'racers':output,'racerTechniqueSampleThreshold':{'starts':20,'wins':5},
      'courseRateMinimumStarts':10,
      'preRaceAuthenticated':False,'predictedWinner':None,'scoreChangesProposed':False,
      'warning':'Observed winning methods and entry courses are descriptive history, not verified pre-race predictive probabilities. Course rate shown only with >=10 observed starts at that course and overall >=20 starts/5 wins. Missing or insufficient samples are not zero.'}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--history',required=True);p.add_argument('--racers',required=True);p.add_argument('--output',required=True)
    a=p.parse_args();out=report(json.loads(Path(a.history).read_text()),json.loads(Path(a.racers).read_text()))
    dest=Path(a.output);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'racerCount':len(out['racers']),'descriptiveSamples':sum(r['status']=='descriptive_sample_available' for r in out['racers']),'scoreChangesProposed':False}))
