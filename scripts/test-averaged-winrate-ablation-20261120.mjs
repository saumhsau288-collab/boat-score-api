import assert from 'node:assert/strict';
import {replayDeployedBaseTickets} from './replay-deployed-base-tickets.mjs';
// Offline fixture-only ablation: isolate local=0 fallback from averaging.
// Do not use this test as historical accuracy evidence.
const rows=[
 {boat:1,win:8,local:2,motor:55},
 {boat:2,win:6,local:7,motor:50},
 {boat:3,win:5,local:0,motor:45},
 {boat:4,win:7,local:3,motor:40},
 {boat:5,win:4,local:8,motor:35},
 {boat:6,win:3,local:6,motor:30}
];
const rank=(items,key)=>new Map([...items].sort((a,b)=>b[key]-a[key]||a.boat-b.boat).map((r,i)=>[r.boat,6-i]));
const sorted=s=>[...s].sort((a,b)=>b.score-a.score||a.boat-b.boat);
function candidate(items,average){
 const a=items.map(r=>({...r,adjustedLocal:r.local===0?r.win:r.local,averageWin:(r.win+(r.local===0?r.win:r.local))/2}));
 const wr=rank(a,'win'),lr=rank(a,'adjustedLocal'),ar=rank(a,'averageWin'),mr=rank(a,'motor');
 return sorted(a.map(r=>({boat:r.boat,score:average?7*ar.get(r.boat)+3*mr.get(r.boat):5*wr.get(r.boat)+2*lr.get(r.boat)+3*mr.get(r.boat)})));
}
const old=replayDeployedBaseTickets(rows);
assert.equal(old.ready,true);
const baseline=sorted(old.rankedScores);
const fallback=candidate(rows,false),averaged=candidate(rows,true);
assert.deepEqual(baseline.map(x=>[x.boat,x.score]),[[1,52],[2,45],[4,40],[3,29],[5,28],[6,16]]);
assert.deepEqual(fallback.map(x=>[x.boat,x.score]),[[1,50],[2,45],[4,38],[3,33],[5,28],[6,16]]);
assert.deepEqual(averaged.map(x=>[x.boat,x.score]),[[2,57],[1,46],[5,41],[3,33],[4,23],[6,10]]);
console.log(JSON.stringify({status:'fixture_only',baseline,fallback,averaged},null,2));
