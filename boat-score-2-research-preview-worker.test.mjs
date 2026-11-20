import assert from 'node:assert/strict';
import worker from './boat-score-2-research-preview-worker.js';
const call=(path,options={})=>worker.fetch(new Request('https://preview.invalid'+path,options));
const health=await call('/health');assert.equal(health.status,200);
assert.equal((await health.json()).liveData,false);
assert.equal((await call('/api/research/evaluate')).status,405);
assert.equal((await call('/api/research/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:'{'})).status,400);
const racers=[6,6,6,6,6,6].map((n,i)=>({boat:i+1,nationalWinRate:n,localWinRate:n,motorTwoWinRate:50,recent50WinRate:50}));
const payload={venue:'01',date:'20261121',race:1,phase:'morning',verified:true,racers};
const response=await call('/api/research/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
assert.equal(response.status,200);
const result=await response.json();
assert.equal(result.closeAbilityReview.status,'review');
assert.equal(result.closeAbilityReview.affectsScore,false);
assert.equal(result.liveData,false);
assert.equal(result.sourceVerification,'caller_asserted_not_independently_audited');
assert.equal((await call('/api/research/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,verified:false})})).status,422);
const sourceRequest=async body=>call('/api/research/evaluate-sources',{
 method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
});
const missing=await sourceRequest({});
assert.equal(missing.status,422);
const unverified=await sourceRequest({official:{verified:false,racers:[]},recent50:[]});
assert.equal(unverified.status,422);
const missingResult=await unverified.json();
assert.equal(missingResult.status,'insufficient_data');
assert.equal(missingResult.liveData,false);
const official=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4001+i),name:'選手'+(i+1),sourceVerified:true,
 nationalWinRate:i===0?9:5,localWinRate:i===0?9:5,motorTwoWinRate:50
}));
const recent50=official.map(r=>({racerId:r.racerId,winRate:50,verified:true,sourceVerified:true}));
const verified=await sourceRequest({official,recent50});
assert.equal(verified.status,200);
const verifiedBody=await verified.json();
assert.equal(verifiedBody.status,'evaluated');
assert.equal(verifiedBody.category,'favorite');
assert.deepEqual(verifiedBody.sources,['official_racelist','verified_recent50']);
assert.equal(verifiedBody.sourceVerification,'provided_source_flags_checked_not_independently_fetched');
const mismatch=await sourceRequest({official,recent50:recent50.map((r,i)=>i===1?{...r,racerId:'9999'}:r)});
assert.equal(mismatch.status,422);
assert.equal((await mismatch.json()).status,'insufficient_data');
const invalidSelection=await call('/api/research/official-racelist?venue=25&date=20261121&race=1');
assert.equal(invalidSelection.status,400);
assert.equal((await invalidSelection.json()).status,'invalid_selection');
assert.equal((await call('/api/research/official-racelist',{method:'POST'})).status,405);
const invalidMetrics=await call('/api/research/official-metrics?venue=25&date=20261121&race=1');
assert.equal(invalidMetrics.status,400);
assert.equal((await invalidMetrics.json()).status,'invalid_selection');
assert.equal((await call('/api/research/official-metrics',{method:'POST'})).status,405);
console.log('Isolated research preview API tests passed');
