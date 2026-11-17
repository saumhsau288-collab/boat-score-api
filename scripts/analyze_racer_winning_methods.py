#!/usr/bin/env python3
"""Offline racer-by-racer historical winning-technique evidence. Never changes live scores."""
import argparse,collections,json
from pathlib import Path
METHODS=('逃げ','差し','まくり','まくり差し','抜き','恵まれ')
def analyze(reports):
    seen=set();racer_stats={};race_count=0;method_count=collections.Counter();unverified=0
    for report in reports:
        for race in report.get('records',[]):
            key=(race['date'],race['venue'],race['race'])
            if key in seen:raise ValueError('duplicate historical race')
            seen.add(key);race_count+=1
            racers=race['racers'];order=race['finishOrder']
            if race.get('resultVerified') is not True or len(racers)!=6 or len(order)!=6 or sorted(order)!=list(range(1,7)) or {r['boat'] for r in racers}!=set(range(1,7)) or len({r['racerId'] for r in racers})!=6:
                raise ValueError('invalid verified race')
            method=race.get('winningMethod') if race.get('winningMethodVerified') is True and race.get('winningMethod') in METHODS else None
            courses=race.get('entryCourseByBoat') if race.get('entryCourseVerified') is True else None
            if courses is not None:
                courses={int(k):v for k,v in courses.items()}
                if set(courses)!=set(range(1,7)) or set(courses.values())!=set(range(1,7)):courses=None
            if method:method_count[method]+=1
            else:unverified+=1
            for racer in racers:
                rid=racer['racerId'];boat=racer['boat'];position=order.index(boat)+1
                s=racer_stats.setdefault(rid,{'racerId':rid,'starts':0,'first':0,'second':0,'third':0,'methods':collections.Counter(),'entryCourses':{},'nationalWinRates':[],'localWinRates':[]})
                s['starts']+=1
                if position==1:s['first']+=1
                if position==2:s['second']+=1
                if position==3:s['third']+=1
                if isinstance(racer.get('nationalWinRate'),(int,float)):s['nationalWinRates'].append(racer['nationalWinRate'])
                if isinstance(racer.get('localWinRate'),(int,float)):s['localWinRates'].append(racer['localWinRate'])
                if courses is not None:
                    course=courses[boat]
                    cs=s['entryCourses'].setdefault(str(course),{'starts':0,'first':0,'second':0,'third':0,'winningMethods':collections.Counter()})
                    cs['starts']+=1
                    if position==1:cs['first']+=1
                    if position==2:cs['second']+=1
                    if position==3:cs['third']+=1
                    if position==1 and method:cs['winningMethods'][method]+=1
                if position==1 and method:s['methods'][method]+=1
    result=[]
    for s in racer_stats.values():
        starts=s['starts']
        result.append({'racerId':s['racerId'],'observedStarts':starts,'observedWins':s['first'],'observedSecond':s['second'],'observedThird':s['third'],
          'observedPodiums':s['first']+s['second']+s['third'],'observedWinRatePercent':round(s['first']/starts*100,2),
          'winningMethods':dict(s['methods']),'entryCourses':{k:{**v,'winningMethods':dict(v['winningMethods'])} for k,v in sorted(s['entryCourses'].items())},
          'officialNationalWinRateSamples':s['nationalWinRates'],'officialLocalWinRateSamples':s['localWinRates'],
          'sampleInsufficientForIndividualTechniquePreference':starts<20 or s['first']<5,
          'winningMethodSharesOfWinsPercent':{m:round(n/s['first']*100,2) for m,n in s['methods'].items()} if s['first']>=5 and starts>=20 else None,
          'winningMethodWinsPerStartPercent':{m:round(n/starts*100,2) for m,n in s['methods'].items()} if s['first']>=5 and starts>=20 else None})
    result.sort(key=lambda x:(-x['observedStarts'],x['racerId']))
    eligible=sum(not r['sampleInsufficientForIndividualTechniquePreference'] for r in result)
    return {'scope':'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION','racerMethodSampleThreshold':{'minimumStarts':20,'minimumWins':5},'racersMeetingTechniqueSampleThreshold':eligible,'racersBelowTechniqueSampleThreshold':len(result)-eligible,'raceCount':race_count,'uniqueRacers':len(result),'winningMethods':dict(method_count),'unverifiedWinningMethods':unverified,
      'racerEvidence':result,'warnings':['Official national/local win rates measure individual ability and are NOT course-specific rates','Observed winner methods count only actual wins; non-winning finishers have no winner method','Historical B archive capture time not independently verified before race; do not optimize or deploy weights','At least 20 starts and 5 wins are required to display descriptive method percentages; meeting this threshold does not prove predictive value','Small samples do not establish racer technique preference; no live score changes']}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('inputs',nargs='+');p.add_argument('--output',required=True);a=p.parse_args()
    out=analyze([json.loads(Path(f).read_text(encoding='utf-8')) for f in a.inputs])
    dest=Path(a.output);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in out.items() if k!='racerEvidence'},ensure_ascii=False))
