import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCapturedRankedScores} from './audit-captured-ranked-scores.mjs';
test('six final output scores are recognized but never treated as raw input evidence',()=>{
 const scores=[1,2,3,4,5,6].map(boat=>({boat,score:boat*7}));
 const capture={authenticatedBeforeRace:false,records:[{date:'20261120',venue:2,race:1,
  response:{ready:true,rankedScores:scores}}]};
 const result=auditCapturedRankedScores(capture);
 assert.equal(result.validSixBoatOutputScoreSets,1);
 assert.equal(result.rawScoreInputsVerified,0);
 assert.equal(result.eligibleForCalibration,false);
 assert.equal(result.cases[0].sixBoatOutputScoresPresent,true);
});
test('duplicate boat and nonnumeric score do not pass validation',()=>{
 const scores=[1,2,3,4,5,5].map(boat=>({boat,score:12}));
 scores[1].score='12';
 const result=auditCapturedRankedScores({authenticatedBeforeRace:false,
  records:[{response:{ready:true,rankedScores:scores}}]});
 assert.equal(result.invalidOrMissingScoreSets,1);
 assert.equal(result.eligibleForCalibration,false);
});
