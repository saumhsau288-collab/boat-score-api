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

const noTie=[71,85,60,84,50,40].map((score,i)=>({boat:i+1,course:i+1,courseVerified:true,score}));
const noTieResult=compareThreeTiePolicies([{...row([2,4,1]),boats:noTie}]);
assert.equal(noTieResult.changedFromBaseline.winnerOnly,0);
assert.equal(noTieResult.changedFromBaseline.fullExclusion,0);
// Boat number and actual entry course may differ: course decides the tie.
const swapped=boats.map(b=>({...b,course:b.boat===2?5:b.boat===4?2:b.course}));
const swappedResult=compareThreeTiePolicies([{...row([2,4,1]),boats:swapped}]);
assert.equal(swappedResult.examples[0].leaders.baseline,4);
assert.equal(swappedResult.examples[0].leaders.winnerOnly,2);
// All six scores equal: full exclusion cannot form a trifecta.
const allEqual=boats.map(b=>({...b,score:80}));
const insufficient=compareThreeTiePolicies([{...row([6,5,4]),boats:allEqual}]);
assert.equal(insufficient.arms.fullExclusion.trifecta,0);
assert.equal(insufficient.changedFromBaseline.fullExclusion,1);
const badCourse=boats.map((b,i)=>i===0?{...b,course:2}:b);
assert.equal(compareThreeTiePolicies([{...row([4,2,1]),boats:badCourse}]).eligible,0);
console.log('Three-policy synthetic fixture passed; NOT an empirical backtest.');
