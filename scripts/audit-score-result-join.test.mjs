import test from 'node:test';
import assert from 'node:assert/strict';
import {auditScoreResultJoin} from './audit-score-result-join.mjs';
test('saved final scores with no verified result stay held',()=>{
 const capture={authenticatedBeforeRace:false,records:[{date:'20261120',venue:18,race:1,
  httpStatus:200,receivedAt:'2026-11-19T23:50:00Z',
  response:{ready:true,rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:10+boat}))}}]};
 const out=auditScoreResultJoin(capture,[]);
 assert.equal(out.validSixBoatOutputScoreSets,1);
 assert.equal(out.resultComparisonsEligible,0);
 assert.equal(out.resultComparisonsHeld,1);
 assert.equal(out.rows[0].sixBoatOutputScoresPresent,true);
 assert.ok(out.rows[0].holdReasons.includes('capture_not_authenticated_before_race'));
 assert.ok(out.rows[0].holdReasons.includes('no_independently_verified_result'));
 assert.equal(out.weightChangesPermitted,false);
});

test('non-ready records do not shift score evidence onto the wrong race',()=>{
 const capture={authenticatedBeforeRace:false,records:[
  {date:'20261120',venue:1,race:1,httpStatus:200,response:{ready:false}},
  {date:'20261120',venue:2,race:1,httpStatus:200,response:{ready:true,
   rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:boat*2}))}},
  {date:'20261120',venue:3,race:1,httpStatus:200,response:{ready:false}}
 ]};
 const out=auditScoreResultJoin(capture,[]);
 assert.deepEqual(out.rows.map(r=>r.sixBoatOutputScoresPresent),[false,true,false]);
 assert.equal(out.resultComparisonsEligible,0);
});
