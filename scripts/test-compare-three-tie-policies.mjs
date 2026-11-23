import assert from 'node:assert/strict';
import {compareThreeTiePolicies} from './compare-three-tie-policies.mjs';
const boats=[70,85,60,85,50,40].map((score,i)=>({boat:i+1,course:i+1,courseVerified:true,score}));
const row=actual=>({date:'20261120',venue:1,race:1,capturedBeforeCutoff:true,officialResultVerified:true,boats,actual});
const r=compareThreeTiePolicies([row([4,2,1]),row([2,4,1]),{...row([4,2,1]),capturedBeforeCutoff:false}]);
assert.equal(r.total,3);
assert.equal(r.eligible,2);
assert.equal(r.excluded.unverified_capture_or_result,1);
assert.equal(r.arms.baseline.winner,1);
assert.equal(r.arms.winnerOnly.winner,1);
assert.equal(r.arms.fullExclusion.winner,1);
assert.equal(r.arms.fullExclusion.trifecta,0); // 2-course excluded entirely
assert.ok(r.changedFromBaseline.winnerOnly>0);
assert.ok(r.changedFromBaseline.fullExclusion>0);
assert.ok(r.examples[0].tickets.winnerOnly.some(p=>p.includes(2))); // retained in lower positions
assert.ok(r.examples[0].tickets.fullExclusion.every(p=>!p.includes(2)));
console.log('Three-policy synthetic fixture passed; NOT an empirical backtest.');
