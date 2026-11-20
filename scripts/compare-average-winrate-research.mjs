// Research-only comparison. Never modifies deployed prediction weights.
import assert from 'node:assert/strict';
import { replayDeployedBaseTickets } from './replay-deployed-base-tickets.mjs';

const rank = (rows, key) => new Map([...rows].sort((a,b)=>b[key]-a[key]||a.boat-b.boat).map((r,i)=>[r.boat,6-i]));
export function compareAverageWinRate(rows) {
  const baseline = replayDeployedBaseTickets(rows);
  if (!baseline.ready) return {status:'insufficient_data',reason:baseline.reason};
  if (rows.some(r=>typeof r.local!=='number'||!Number.isFinite(r.local)||r.local<0||r.local>10))
    return {status:'insufficient_data',reason:'local_win_rate_missing'};
  const enriched=rows.map(r=>({...r,average:(r.win+(r.local===0?r.win:r.local))/2}));
  const ability=rank(enriched,'average'),motor=rank(enriched,'motor');
  const candidate=enriched.map(r=>({boat:r.boat,averageWinRate:r.average,score:7*ability.get(r.boat)+3*motor.get(r.boat)}));
  const sortScores=a=>[...a].sort((x,y)=>y.score-x.score||x.boat-y.boat).map(x=>x.boat);
  return {status:'compared',baselineOrder:sortScores(baseline.rankedScores),
    candidateOrder:sortScores(candidate),candidate,baseline:baseline.rankedScores,
    // Historical accuracy requires independent verified pre-race captures and official results.
    historicalAccuracyCalculated:false};
}

const fixture=[
 {boat:1,win:8,local:2,motor:40},
 {boat:2,win:7,local:8,motor:40},
 {boat:3,win:6,local:6,motor:40},
 {boat:4,win:5,local:5,motor:40},
 {boat:5,win:4,local:4,motor:40},
 {boat:6,win:3,local:3,motor:40}
];
const result=compareAverageWinRate(fixture);
assert.equal(result.status,'compared');
assert.equal(result.candidateOrder[0],2);
assert.equal(result.baselineOrder[0],1);
assert.equal(compareAverageWinRate(fixture.map(r=>r.boat===2?{...r,local:0}:r)).status,'compared');
assert.equal(compareAverageWinRate(fixture.slice(1)).status,'insufficient_data');
assert.equal(compareAverageWinRate(fixture.map(r=>r.boat===2?{...r,local:null}:r)).status,'insufficient_data');
console.log(JSON.stringify({status:result.status,baselineOrder:result.baselineOrder,candidateOrder:result.candidateOrder,historicalAccuracyCalculated:false}));
