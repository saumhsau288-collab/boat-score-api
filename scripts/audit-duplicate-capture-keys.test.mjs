import test from 'node:test';
import assert from 'node:assert/strict';
import {auditDuplicateCaptureKeys} from './audit-duplicate-capture-keys.mjs';
test('duplicate race keys are flagged without counting as independent trials',()=>{
 const result=auditDuplicateCaptureKeys({records:[
  {date:'20261118',venue:11,race:3},
  {date:'20261118',venue:11,race:3},
  {date:'20261118',venue:11,race:4}
 ]});
 assert.equal(result.duplicateRaceKeys,1);
 assert.equal(result.excessDuplicateRecords,1);
 assert.equal(result.safeForIndependentRaceHitRate,false);
});
test('distinct races are safe',()=>{
 const result=auditDuplicateCaptureKeys({records:[{date:'20261118',venue:11,race:3},{date:'20261118',venue:11,race:4}]});
 assert.equal(result.safeForIndependentRaceHitRate,true);
});

test('invalid identifiers prevent independent hit-rate approval',()=>{
 const result=auditDuplicateCaptureKeys({records:[{date:'20261118',venue:1,race:1},{date:'20261118',venue:25,race:1},{date:'bad',venue:1,race:2}]});
 assert.equal(result.duplicateRaceKeys,0);
 assert.equal(result.invalidRaceKeyRecords,2);
 assert.equal(result.safeForIndependentRaceHitRate,false);
});
