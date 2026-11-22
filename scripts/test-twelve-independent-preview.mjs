import assert from 'node:assert/strict';
import {generateTwelveIndependentMethods, METHOD_IDS} from '../generate-twelve-independent-methods.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,nationalRate:7-i*.5,localRate:6-i*.4,averageST:.12+i*.01,motor2Rate:40-i*2,exhibitionTime:6.7+i*.03,last50CoursePodiumRate:55-i*4}));
const result=generateTwelveIndependentMethods({racers});
assert.deepEqual(Object.keys(result.methods),METHOD_IDS);
for(const id of METHOD_IDS){const m=result.methods[id];assert.ok(['predicted','abstain'].includes(m.status),id);if(m.status==='predicted'){assert.equal(m.trifecta.length,3,id);assert.equal(new Set(m.trifecta).size,3,id);assert.ok(m.trifecta.every(n=>n>=1&&n<=6),id);}}
const missing=generateTwelveIndependentMethods({racers:racers.map(r=>({...r,exhibitionTime:NaN,last50CoursePodiumRate:NaN}))});
assert.equal(missing.methods['favorite-5'].status,'abstain');
assert.equal(missing.methods['favorite-6'].status,'abstain');
assert.equal(missing.methods['upset-6'].status,'abstain');
assert.equal(generateTwelveIndependentMethods({racers:racers.map(r=>({...r,localRate:0}))}).methods['favorite-1'].status,'predicted');
assert.throws(()=>generateTwelveIndependentMethods({racers:racers.map((r,i)=>({...r,course:i===5?1:r.course}))}),/Six unique/);
console.log('12 independent methods: shape, valid trifectas, missing data, local 0 fallback and course validation passed');
