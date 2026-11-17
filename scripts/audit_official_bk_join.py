#!/usr/bin/env python3
"""Read-only descriptive audit of official B/K joins; not a Boat Score 2 prediction."""
import argparse,collections,json
from pathlib import Path
WEIGHTS={"nationalWinRate":45,"localWinRate":25,"motorTwoWinRate":15}
LIMITS={"nationalWinRate":10,"localWinRate":10,"motorTwoWinRate":100}
def audit(data):
    records=data.get("records",[])
    seen=set();details=[]
    for r in records:
        key=(r.get("date"),r.get("venue"),r.get("race"))
        if key in seen:raise ValueError("duplicate race")
        seen.add(key)
        racers=r["racers"];order=r["finishOrder"]
        if len(racers)!=6 or {x["boat"] for x in racers}!=set(range(1,7)) or len({x["racerId"] for x in racers})!=6 or sorted(order)!=list(range(1,7)) or r.get("resultVerified") is not True:raise ValueError("invalid official join")
        def score(x):
            return sum(x[k]/LIMITS[k]*v for k,v in WEIGHTS.items())
        ranked=[x["boat"] for x in sorted(racers,key=lambda x:(-score(x),x["boat"]))]
        details.append({"race":r["race"],"actualTop3":order[:3],"partialMetricsRankTop3":ranked[:3],"partialWinnerMatch":ranked[0]==order[0],"partialExactTop3":ranked[:3]==order[:3],"partialPodiumSetMatch":set(ranked[:3])==set(order[:3]),"pointInTimeVerified":r.get("asOfVerified") is True and r.get("capturedBeforeStart") is True})
    winners=dict(sorted(collections.Counter(r["finishOrder"][0] for r in records).items()))
    return {"scope":"OFFLINE_EXPLORATORY_THREE_METRIC_RANKING_NOT_DEPLOYED_BOAT_SCORE_2","raceCount":len(records),"winnersByBoat":winners,"insideWins":winners.get(1,0),"partialWinnerMatches":sum(x["partialWinnerMatch"] for x in details),"partialExactTop3":sum(x["partialExactTop3"] for x in details),"partialPodiumSetMatches":sum(x["partialPodiumSetMatch"] for x in details),"pointInTimeVerifiedRaces":sum(x["pointInTimeVerified"] for x in details),"weights":WEIGHTS,"warning":"Historical program snapshot capture times unverified. No predictive accuracy claim, no weight tuning, no deployment. These scores omit Makulabo, recent50, exhibition, wind, ST and actual app logic.","details":details}
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("input");p.add_argument("--output",required=True);a=p.parse_args()
    result=audit(json.loads(Path(a.input).read_text(encoding="utf-8")))
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="details"},ensure_ascii=False))
