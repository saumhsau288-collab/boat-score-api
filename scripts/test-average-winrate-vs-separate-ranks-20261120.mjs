import assert from 'node:assert/strict';
import {replayDeployedBaseTickets} from './replay-deployed-base-tickets.mjs';

// Research-only comparison. Do not change deployed predictor or claim accuracy.
const rank = (rows,key) => new Map([...rows].sort((a,b)=>b[key]-a[key]||a.boat-b.boat).map((r,i)=>[r.boat,6-i]));
function averageAbilityMotor(rows) {
  if(rows.length!==6 || new Set(rows.map(r=>r.boat)).size!==6) throw Error('invalid six-boat fixture');
  const prepared=rows.map(r=>{
    const local=r.local===0?r.win:r.local;
    if(![r.win,local,r.motor].every(Number.isFinite)) throw Error('missing metric');
    return {...r,average:(r.win+local)/2};
  });
  const ability=rank(prepared,'average'),motor=rank(prepared,'motor');
  return prepared.map(r=>({boat:r.boat,score:7*ability.get(r.boat)+3*motor.get(r.boat)}))
    .sort((a,b)=>b.score-a.score||a.boat-b.boat);
}
// Deliberately contrasting national/local performance, with valid 0.00 fallback.
const rows=[
  {boat:1,win:8.0,local:2.0,motor:55},
  {boat:2,win:6.0,local:7.0,motor:50},
  {boat:3,win:5.0,local:0.0,motor:45},
  {boat:4,win:7.0,local:3.0,motor:40},
  {boat:5,win:4.0,local:8.0,motor:35},
  {boat:6,win:3.0,local:6.0,motor:30}
];
const old=replayDeployedBaseTickets(rows);
assert.equal(old.ready,true);
const proposed=averageAbilityMotor(rows);
assert.equal(proposed.length,6);
assert.equal(proposed.find(r=>r.boat===3).score,7*rank(rows.map(r=>({...r,average:(r.win+(r.local===0?r.win:r.local))/2})),'average').get(3)+3*rank(rows,'motor').get(3));
const oldOrder=[...old.rankedScores].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(r=>r.boat);
const newOrder=proposed.map(r=>r.boat);
console.log(JSON.stringify({status:'fixture_only_not_historical_accuracy',oldOrder,newOrder,changed:JSON.stringify(oldOrder)!==JSON.stringify(newOrder)},null,2));
