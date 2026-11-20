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
console.log('Isolated research preview API tests passed');
