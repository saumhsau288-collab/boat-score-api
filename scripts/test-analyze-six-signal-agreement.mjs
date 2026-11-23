import assert from 'node:assert/strict';
import {analyzeSixSignalAgreement} from './analyze-six-signal-agreement.mjs';
const base=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,nationalWinRate:5+i*.5,
 localWinRate:5+i*.5,motorTwoWinRate:40,recent50WinRate:40,exhibitionScore:50,startTiming:.20-i*.02}));
const result=analyzeSixSignalAgreement(base);
assert.equal(result.status,'research_only');
assert.deepEqual(result.unanimousTopThree,[]);
assert.deepEqual(result.firstPlaceSignalAgreement,[6]);
assert.equal(result.rows.length,6);
assert.equal(result.rows.find(r=>r.boat===6).topThreeSignalCount,2);
assert.equal(result.rows.find(r=>r.boat===1).topThreeSignalCount,1);
assert.equal(result.consensusTopThree.length,3);
const missing=analyzeSixSignalAgreement(base.map(r=>r.boat===2?{...r,startTiming:null}:r));
assert.equal(missing.status,'insufficient_course_start_data');
console.log('Six-boat signal agreement fixtures passed; research only');
