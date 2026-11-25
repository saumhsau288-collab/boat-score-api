import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateLockedProspectivePredictions} from './evaluate-locked-prospective-predictions.mjs';
const capture={venue:2,date:'20261122',race:3,sourceUrl:'https://example.org/official',capturedAt:'2026-11-22T10:00:00+09:00',scheduledStartAt:'2026-11-22T10:10:00+09:00',racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,averageStartTiming:.15}))};
const verification={verified:true,sourceUrl:capture.sourceUrl,verifiedAt:'2026-11-22T10:01:00+09:00',method:'externally reviewed'};
const prediction={date:'20261122',venue:2,race:3,capture,verification,ruleVersion:'inner-challenger-frozen-20261122',predictedAt:'2026-11-22T10:02:00+09:00',predictedFirst:1,predictedTrifecta:[1,2,3],writtenAt:'2026-11-22T10:03:00+09:00'};
const result={date:'20261122',venue:2,race:3,resultVerified:true,finishOrder:[1,2,3,4,5,6]};
test('only matches verified results to timely frozen predictions',()=>{
 const r=evaluateLockedProspectivePredictions([prediction],[result]);
 assert.equal(r.matched,1);assert.equal(r.firstCorrect,1);assert.equal(r.exactTrifecta,1);
 assert.equal(r.status,'VERIFIED_RESULT_MATCHES_WITH_EXTERNALLY_ASSERTED_SOURCE');
});
test('rejects unverified sources and late predictions',()=>{
 assert.equal(evaluateLockedProspectivePredictions([{...prediction,verification:null}],[result]).matched,0);
 assert.equal(evaluateLockedProspectivePredictions([{...prediction,predictedAt:'2026-11-22T10:11:00+09:00'}],[result]).matched,0);
});
test('duplicate official results are never counted',()=>{
 const r=evaluateLockedProspectivePredictions([prediction],[result,result]);
 assert.equal(r.matched,0);assert.equal(r.rejected[0].reason,'duplicate_result');
});
test('unknown official result remains unmatched',()=>{
 const r=evaluateLockedProspectivePredictions([prediction],[]);
 assert.equal(r.unmatched,1);assert.equal(r.matched,0);
});

test('three repeated prediction keys remain excluded',()=>{
 const r=evaluateLockedProspectivePredictions([prediction,prediction,prediction],[result]);
 assert.equal(r.matched,0);assert.equal(r.admittedPredictions,0);
});
test('prediction cannot precede capture',()=>{
 const r=evaluateLockedProspectivePredictions([{...prediction,predictedAt:'2026-11-22T09:59:00+09:00'}],[result]);
 assert.equal(r.matched,0);
});

test('verification after prediction cannot retroactively admit a race',()=>{
 const late={...verification,verifiedAt:'2026-11-22T10:05:00+09:00'};
 const r=evaluateLockedProspectivePredictions([{...prediction,verification:late}],[result]);
 assert.equal(r.matched,0);assert.equal(r.rejected[0].reason,'source_verified_too_late');
});
test('verification after race start is rejected',()=>{
 const late={...verification,verifiedAt:'2026-11-22T10:12:00+09:00'};
 assert.equal(evaluateLockedProspectivePredictions([{...prediction,verification:late}],[result]).matched,0);
});

test('prediction timestamp without timezone is not trusted',()=>{
 const r=evaluateLockedProspectivePredictions([{...prediction,predictedAt:'2026-11-22T10:02:00'}],[result]);
 assert.equal(r.matched,0);assert.equal(r.rejected[0].reason,'rule_or_prediction_time_invalid');
});

test('rejects missing or post-start write timestamps',()=>{
 assert.equal(evaluateLockedProspectivePredictions([{...prediction,writtenAt:undefined}],[result]).rejected[0].reason,'write_time_invalid');
 assert.equal(evaluateLockedProspectivePredictions([{...prediction,writtenAt:'2026-11-22T10:11:00+09:00'}],[result]).rejected[0].reason,'write_time_invalid');
});
