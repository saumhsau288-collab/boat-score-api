import assert from 'node:assert/strict';
import {comparePhaseScores as compare} from '../boat-score-2-phase-comparison.js';
const base={nationalWinRate:6,localWinRate:4,motorTwoWinRate:40,recent50WinRate:35,exhibitionScore:50,startTiming:.15};
const normal=compare({...base,exhibitionST:'.12'});
assert.equal(normal.st.average,.15);
assert.equal(normal.st.exhibition,.12);
assert.equal(normal.st.exhibitionStatus,'normal');
assert.equal(normal.eligibleForSTStudy,true);
for(const [raw,status,seconds,eligible] of [['F.03','flying',-.03,true],['L','late',null,true],['','missing',null,false],['bad','invalid',null,false]]){
 const r=compare({...base,exhibitionST:raw});
 assert.equal(r.st.exhibitionStatus,status);
 assert.equal(r.st.exhibition,seconds);
 assert.equal(r.eligibleForSTStudy,eligible);
 assert.deepEqual(r.legacyMorning,normal.legacyMorning);
 assert.deepEqual(r.legacyPrestart,normal.legacyPrestart);
}
assert.equal(compare({...base,startTiming:undefined,exhibitionST:'.12'}).eligibleForSTStudy,false);
assert.equal(compare({...base,exhibitionScore:undefined,exhibitionST:'.12'}).eligibleForSTStudy,false);
console.log('PASS: phase comparison integration (7 synthetic cases)');
