import assert from 'node:assert/strict';
import {evaluateRelativeInsidePreview} from './boat-score-2-relative-inside-preview.js';
const scores=[3,4,5,9,7,6];
const payload={venue:'01',date:'20261124',race:1,verified:true,racers:scores.map((n,i)=>({
 boat:i+1,course:i+1,racerId:'r'+(i+1),nationalWinRate:n,localWinRate:n,
 motorTwoWinRate:50,recent50WinRate:50,exhibitionScore:50,startTiming:.13+i*.01
}))};
assert.equal(evaluateRelativeInsidePreview({...payload,verified:false}).status,'unverified_source');
assert.equal(evaluateRelativeInsidePreview({...payload,racers:payload.racers.slice(0,5)}).status,'insufficient_original_inputs');
assert.equal(evaluateRelativeInsidePreview({...payload,venue:'25'}).status,'invalid_selection');
const result=evaluateRelativeInsidePreview(payload);
assert.equal(result.status,'research_preview');
assert.equal(result.main.length,6);
assert.equal(result.upset.length,6);
assert.ok(result.supportedUpsetCount>0);
for(const pick of result.upset){
 if(pick.supportedRelativeUpset){
  assert.ok(pick.beatenHigherScoringInside.length>0);
  assert.ok(pick.beatenHigherScoringInside.every(r=>r.course<payload.racers.find(x=>x.boat===pick.ticket[0]).course));
 }
}
const swapped={...payload,racers:payload.racers.map((r,i)=>({...r,course:[5,2,3,4,1,6][i]}))};
assert.equal(evaluateRelativeInsidePreview(swapped).status,'research_preview');
console.log('BOAT_SCORE_2_RELATIVE_INSIDE_PREVIEW '+JSON.stringify({status:result.status,supportedUpsetCount:result.supportedUpsetCount,upset:result.upset.map(x=>({ticket:x.ticket,supported:x.supportedRelativeUpset,beatenInside:x.beatenHigherScoringInside.map(r=>r.boat)}))}));
console.log('PASS: verified-only Boat Score 2 relative-inside preview integration');
