import test from 'node:test';
import assert from 'node:assert/strict';
import {auditScoreResultJoin} from './audit-score-result-join.mjs';
test('saved final scores with no verified result stay held',()=>{
 const capture={authenticatedBeforeRace:false,records:[{date:'20261120',venue:18,race:1,
  httpStatus:200,receivedAt:'2026-11-19T23:50:00Z',
  response:{ready:true,rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:10+boat}))}}]};
 const out=auditScoreResultJoin(capture,[]);
 assert.equal(out.validSixBoatOutputScoreSets,1);
 assert.equal(out.authenticatedSixBoatRawInputSets,0);
 assert.equal(out.rows[0].sixBoatRawInputsAuthenticated,false);
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

test('duplicate race keys remain held even when both records contain six scores',()=>{
 const rankedScores=[1,2,3,4,5,6].map(boat=>({boat,score:boat*3}));
 const record={date:'20261120',venue:17,race:2,httpStatus:200,
  receivedAt:'2026-11-20T00:00:00Z',response:{ready:true,rankedScores}};
 const out=auditScoreResultJoin({authenticatedBeforeRace:false,records:[record,{...record}]},[]);
 assert.equal(out.validSixBoatOutputScoreSets,2);
 assert.equal(out.resultComparisonsEligible,0);
 assert.deepEqual(out.rows.map(row=>row.sixBoatOutputScoresPresent),[true,true]);
 assert.ok(out.rows.every(row=>row.holdReasons.includes('duplicate_saved_capture_race')));
 assert.equal(out.weightChangesPermitted,false);
});

test('a ready prediction with incomplete output scores is not treated as six-boat evidence',()=>{
 const capture={authenticatedBeforeRace:false,records:[
  {date:'20261120',venue:18,race:3,httpStatus:200,
   response:{ready:true,rankedScores:[1,2,3,4,5].map(boat=>({boat,score:boat}))}}
 ]};
 const out=auditScoreResultJoin(capture,[]);
 assert.equal(out.readyResponses,1);
 assert.equal(out.validSixBoatOutputScoreSets,0);
 assert.equal(out.rows[0].sixBoatOutputScoresPresent,false);
 assert.equal(out.resultComparisonsEligible,0);
 assert.equal(out.weightChangesPermitted,false);
});

test('a result URL for a different race cannot make a saved prediction comparable',()=>{
 const capture={authenticatedBeforeRace:false,records:[{
  date:'20261120',venue:17,race:2,httpStatus:200,
  receivedAt:'2026-11-19T23:40:00Z',
  response:{ready:true,rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:boat})),
   main:[[1,2,3]],upset:[[3,2,1]]}
 }]};
 const results=[{date:'20261120',venue:17,race:2,verified:true,
  sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261120&jcd=17&rno=1',
  officialCutoffAt:'2026-11-20T00:00:00Z',finishOrder:[1,2,3,4,5,6]}];
 const out=auditScoreResultJoin(capture,results);
 assert.equal(out.resultComparisonsEligible,0);
 assert.ok(out.rows[0].holdReasons.includes('official_result_url_race_mismatch'));
 assert.equal(out.weightChangesPermitted,false);
});

test('result for a different date is not joined to the saved race',()=>{
 const capture={authenticatedBeforeRace:false,records:[{
  date:'20261120',venue:17,race:2,httpStatus:200,
  receivedAt:'2026-11-19T23:40:00Z',
  response:{ready:true,rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:boat})),
   main:[[1,2,3]],upset:[[3,2,1]]}
 }]};
 const results=[{date:'20261119',venue:17,race:2,verified:true,
  sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261119&jcd=17&rno=2',
  officialCutoffAt:'2026-11-19T00:00:00Z',finishOrder:[1,2,3,4,5,6]}];
 const out=auditScoreResultJoin(capture,results);
 assert.equal(out.resultComparisonsEligible,0);
 assert.ok(out.rows[0].holdReasons.includes('no_independently_verified_result'));
 assert.equal(out.weightChangesPermitted,false);
});

test('official result from another venue is not matched',()=>{
 const capture={authenticatedBeforeRace:false,records:[{
  date:'20261120',venue:17,race:2,httpStatus:200,
  receivedAt:'2026-11-19T23:40:00Z',
  response:{ready:true,rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:boat})),
   main:[[1,2,3]],upset:[[3,2,1]]}
 }]};
 const results=[{date:'20261120',venue:18,race:2,verified:true,
  sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261120&jcd=18&rno=2',
  officialCutoffAt:'2026-11-20T00:00:00Z',finishOrder:[1,2,3,4,5,6]}];
 const out=auditScoreResultJoin(capture,results);
 assert.equal(out.resultComparisonsEligible,0);
 assert.ok(out.rows[0].holdReasons.includes('no_independently_verified_result'));
 assert.equal(out.weightChangesPermitted,false);
});

test('duplicate official results cannot be accepted as a unique result',()=>{
 const capture={authenticatedBeforeRace:false,records:[{
  date:'20261120',venue:17,race:2,httpStatus:200,
  receivedAt:'2026-11-19T23:40:00Z',
  response:{ready:true,rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:boat})),
   main:[[1,2,3]],upset:[[3,2,1]]}
 }]};
 const result={date:'20261120',venue:17,race:2,verified:true,
  sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261120&jcd=17&rno=2',
  officialCutoffAt:'2026-11-20T00:00:00Z',finishOrder:[1,2,3,4,5,6]};
 const out=auditScoreResultJoin(capture,[result,{...result}]);
 assert.equal(out.resultComparisonsEligible,0);
 assert.ok(out.rows[0].holdReasons.includes('no_independently_verified_result'));
 assert.equal(out.weightChangesPermitted,false);
});
