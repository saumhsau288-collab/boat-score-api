import test from 'node:test';
import assert from 'node:assert/strict';
import {rankTrifectaCandidates} from './candidate-trifecta-score.mjs';
const racers=rates=>rates.map((nationalWinRate,i)=>({boat:i+1,nationalWinRate}));
test('evaluates 120 unique ordered triples with no duplicate boats',()=>{
 const r=rankTrifectaCandidates(racers([8,7,6,5,4,3]),{limit:120});
 assert.equal(r.evaluated,120);assert.equal(r.main.length,120);
 assert.equal(new Set(r.main.map(x=>x.order.join('-'))).size,120);
 assert.ok(r.main.every(x=>new Set(x.order).size===3));
});
test('returns 12 ordered tickets and scores are descending',()=>{
 const r=rankTrifectaCandidates(racers([8,7,6,5,4,3]));
 assert.equal(r.main.length,12);
 assert.ok(r.main.every((x,i)=>i===0||r.main[i-1].score>=x.score));
});
test('outcomes are not inputs to the candidate',()=>{
 const r=racers([8,7,6,5,4,3]);
 const a=rankTrifectaCandidates(r);
 const b=rankTrifectaCandidates(r.map(x=>({...x,resultVerified:true,finishOrder:[6,5,4,3,2,1]})));
 assert.deepEqual(a,b);
});
test('rejects missing data and invalid configuration',()=>{
 assert.throws(()=>rankTrifectaCandidates(racers([8,7,6,5,4,3]),{limit:121}),/limit/);
 assert.throws(()=>rankTrifectaCandidates(racers([8,7,6,5,4,NaN])),/missing/);
});
