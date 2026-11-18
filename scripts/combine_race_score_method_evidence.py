#!/usr/bin/env python3
"""Combine independently calculated offline score bounds with historical method evidence.
No live predictions, inferred odds, or retroactive pre-race validation.
"""
import argparse,json
from pathlib import Path
from report_six_racer_course_methods import report as method_report

def combine(race,score_bounds,history):
    racers=race.get('racers')
    if not isinstance(racers,list) or len(racers)!=6 or {r.get('boat') for r in racers}!=set(range(1,7)):
        raise ValueError('Expected six unique boat entries')
    if not all(isinstance(r.get('racerId'),str) and len(r['racerId'])==4 for r in racers):
        raise ValueError('Official four-digit racer IDs required')
    if score_bounds.get('preRaceAuthenticated') is not False or score_bounds.get('productionChanged') is not False:
        raise ValueError('Score bounds provenance mismatch')
    bounds=score_bounds.get('scoreBounds')
    if not isinstance(bounds,list) or len(bounds)!=6 or {r.get('boat') for r in bounds}!=set(range(1,7)):
        raise ValueError('Expected six score bounds')
    # Fail closed on mismatched identity or unsupported metadata instead of silently joining by boat.
    for row in racers:
        for key,maximum in (('nationalWinRate',10),('localWinRate',10),('motorTwoWinRate',100)):
            value=row.get(key)
            if value is not None and (isinstance(value,bool) or not isinstance(value,(int,float)) or not 0<=value<=maximum):
                raise ValueError('Invalid official score input '+key)
    if score_bounds.get('fullScoreRank') is not None and not score_bounds.get('rankingVerified'):
        raise ValueError('Full ranking without complete scoring evidence')
    for entry in bounds:
        if entry.get('missing') is None or not isinstance(entry.get('missing'),list):
            raise ValueError('Missing score evidence list required')
    methods=method_report(history,racers)
    method_by_boat={r['boat']:r for r in methods['racers']}
    score_by_boat={r['boat']:r for r in bounds}
    output=[]
    for racer in sorted(racers,key=lambda r:r['boat']):
        boat=racer['boat'];score=score_by_boat[boat]
        if any(not isinstance(score.get(k),(int,float)) or isinstance(score.get(k),bool) for k in ('lower','upper','unknownMaximum')):
            raise ValueError('Invalid score bounds')
        if not (0<=score['lower']<=score['upper']<=100):
            raise ValueError('Invalid score interval')
        fields=(('nationalWinRate',45,10),('localWinRate',25,10),
                ('motorTwoWinRate',15,100),('recent50WinRate',10,100),
                ('exhibitionScore',5,100))
        missing=[name for name,weight,limit in fields if racer.get(name) is None]
        if score['missing']!=missing:
            raise ValueError('Score missing fields disagree with racer inputs')
        for name,weight,limit in fields:
            value=racer.get(name)
            if value is not None and (isinstance(value,bool) or
                not isinstance(value,(int,float)) or not 0<=value<=limit):
                raise ValueError('Invalid score input '+name)
        expected_unknown=sum(weight for name,weight,limit in fields if racer.get(name) is None)
        expected_lower=round(sum(racer[name]/limit*weight for name,weight,limit in fields
                                 if racer.get(name) is not None)+1e-9,2)
        expected_upper=min(100,round(expected_lower+expected_unknown,2))
        if score['unknownMaximum']!=expected_unknown or abs(score['lower']-expected_lower)>0.011 or abs(score['upper']-expected_upper)>0.011:
            raise ValueError('Score interval does not match the same racer inputs')
        output.append({'boat':boat,'racerId':racer['racerId'],
          'nationalWinRate':racer.get('nationalWinRate'),'localWinRate':racer.get('localWinRate'),
          'motorTwoWinRate':racer.get('motorTwoWinRate'),
          'scoreLowerBound':score['lower'],'scoreUpperBound':score['upper'],
          'missingScoreInputs':score.get('missing',[]),
          'historicalMethodStatus':method_by_boat[boat]['status'],
          'historicalObservedStarts':method_by_boat[boat]['observedStarts'],
          'historicalObservedWins':method_by_boat[boat]['observedWins'],
          'historicalWinningMethodShares':method_by_boat[boat]['winningMethodSharesOfWinsPercent'],
          'historicalEntryCourseRates':method_by_boat[boat]['entryCourseWinRatesPercent']})
    return {'scope':'OFFLINE_RACE_SCORE_AND_METHOD_EVIDENCE',
      'date':race.get('date'),'venue':race.get('venue'),'race':race.get('race'),
      'racers':output,'partialRank':score_bounds.get('partialRank'),
      'fullScoreRank':score_bounds.get('fullScoreRank'),
      'preRaceAuthenticated':False,'actualDeployedPredictionVerified':False,
      'accuracyCalculationPermitted':False,'scoreWeightsChanged':False,
      'warning':'Historical racer methods and archived program data are not authenticated pre-race inputs. Score bounds use an independent research model. Do not treat this report as a live prediction or accuracy backtest.'}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--race',required=True);p.add_argument('--score-bounds',required=True)
    p.add_argument('--history',required=True);p.add_argument('--output',required=True)
    a=p.parse_args()
    result=combine(*[json.loads(Path(f).read_text(encoding='utf-8')) for f in (a.race,a.score_bounds,a.history)])
    out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'date':result['date'],'venue':result['venue'],'race':result['race'],
      'racerCount':len(result['racers']),'accuracyCalculationPermitted':False},ensure_ascii=False))
