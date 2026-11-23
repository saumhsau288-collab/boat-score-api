import assert from 'node:assert/strict';
import {fetchMorningRankingSnapshot,summarizeMorningRankingSnapshot} from './fetch-readonly-morning-ranking-snapshot.mjs';
const snapshot={date:'20261123',status:'completed',categories:{
 main:[{status:'provisional_not_calibrated',predictedOrder:[1,2,3],capturedAt:'2026-11-22T23:00:00Z',deadlineAt:'2026-11-23T02:00:00Z'}],
 upset:[],chaos:[]}};
const s=summarizeMorningRankingSnapshot(snapshot,'20261123');
assert.equal(s.categories.main.count,1);
assert.equal(s.categories.main.provisionalCount,1);
assert.equal(s.categories.main.withSixRacerEvidence,0);
assert.equal(s.categories.main.withTwelveMethodPredictions,0);
assert.equal(s.categories.main.withPredictedOrder,1);
assert.equal(s.eligibleForTwelveMethodAccuracy,0);
assert.deepEqual(s.reasons,[]);
let called='';
const r=await fetchMorningRankingSnapshot('20261123',{fetchImpl:async url=>{
 called=url;return {ok:true,json:async()=>snapshot};
}});
assert.ok(called.includes('/api/morning/snapshot?date=20261123'));
assert.equal(r.summary.eligibleForTwelveMethodAccuracy,0);
await assert.rejects(()=>fetchMorningRankingSnapshot('20261123',{fetchImpl:async()=>({ok:false,status:503})}),/HTTP 503/);
assert.ok(summarizeMorningRankingSnapshot({date:'20261122'},'20261123').reasons.includes('date_mismatch'));
console.log('Read-only morning ranking fetch and 12-method exclusion tests passed');
