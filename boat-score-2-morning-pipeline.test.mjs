import assert from 'node:assert/strict';
import {evaluateMorningFromSources} from './boat-score-2-morning-pipeline.js';
const official=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'選手'+(i+1),sourceVerified:true,nationalWinRate:i===0?9:5,localWinRate:i===0?9:5,motorTwoWinRate:50}));
const recent50=official.map(r=>({racerId:r.racerId,winRate:50,verified:true,sourceVerified:true}));
assert.equal(evaluateMorningFromSources({official,recent50}).status,'evaluated');
assert.equal(evaluateMorningFromSources({official,recent50}).category,'favorite');
assert.equal(evaluateMorningFromSources({official,recent50:recent50.slice(1)}).status,'insufficient_data');
assert.equal(evaluateMorningFromSources({official,recent50:recent50.map((r,i)=>i===0?{...r,verified:false}:r)}).status,'insufficient_data');
assert.equal(evaluateMorningFromSources({official,recent50:recent50.map((r,i)=>i===0?{...r,sourceVerified:false}:r)}).status,'insufficient_data');
assert.equal(evaluateMorningFromSources({official:official.map((r,i)=>i===0?{...r,sourceVerified:false}:r),recent50}).source,'official');

// Regression: verified last50 changes the actual morning score, not merely metadata.
const baseline=evaluateMorningFromSources({official,recent50});
const improved=recent50.map((r,i)=>i===1?{...r,winRate:100}:r);
const changed=evaluateMorningFromSources({official,recent50:improved});
assert.equal(changed.status,'evaluated');
assert.equal(changed.ranked.find(r=>r.boat===2).score>baseline.ranked.find(r=>r.boat===2).score,true);
// Last50 must be matched by racer ID, not supplied array order.
const reversed=evaluateMorningFromSources({official,recent50:[...improved].reverse()});
assert.deepEqual(reversed.ranked,changed.ranked);
// Invalid, duplicate, missing, or mismatched last50 evidence must fail closed.
assert.deepEqual(evaluateMorningFromSources({official,recent50:improved.map((r,i)=>i===1?{...r,winRate:NaN}:r)}).status,'insufficient_data');
assert.equal(evaluateMorningFromSources({official,recent50:improved.map((r,i)=>i===1?{...r,racerId:improved[0].racerId}:r)}).status,'insufficient_data');
assert.equal(evaluateMorningFromSources({official,recent50:improved.map((r,i)=>i===1?{...r,racerId:'9999'}:r)}).status,'insufficient_data');
// A fabricated zero must never be substituted for an absent record.
assert.equal(evaluateMorningFromSources({official,recent50:improved.map((r,i)=>i===1?{...r,winRate:null}:r)}).status,'insufficient_data');

console.log('Morning verified-source pipeline tests passed');
