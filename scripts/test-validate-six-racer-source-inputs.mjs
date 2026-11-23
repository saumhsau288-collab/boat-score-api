import assert from 'node:assert/strict';
import {validateSixRacerSourceInputs as check} from './validate-six-racer-source-inputs.mjs';
const rows=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,racerId:4000+i,
 nationalWinRate:5,localWinRate:5,motorTwoWinRate:40,recent50WinRate:30,
 exhibitionScore:50,startTiming:0.15}));
assert.equal(check(null).status,'missing_original_inputs');
assert.equal(check(rows).status,'complete_unverified_inputs');
assert.equal(check(rows).authenticated,false);
assert.equal(check(rows.map((r,i)=>i===0?{...r,course:2}:r)).status,'incomplete_original_inputs');
assert.equal(check(rows.map((r,i)=>i===0?{...r,racerId:null}:r)).status,'incomplete_original_inputs');
assert.equal(check(rows.map((r,i)=>i===0?{...r,startTiming:null}:r)).status,'incomplete_original_inputs');
console.log('Original six-racer source input validation fixture passed; no live authentication');
