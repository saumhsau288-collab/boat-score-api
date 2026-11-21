import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSavedRankedScores} from './compare-saved-ranked-scores.mjs';
const result={date:'20261120',venue:2,race:1,finishOrder:[4,1,2,3,5,6]};
const scores=Array.from({length:6},(_,i)=>({boat:i+1,score:i===3?50:40-i}));
const capture={date:result.date,venue:2,race:1,httpStatus:200,response:{ready:true,rankedScores:scores,predictionMode:'base_stats_only'}};
test('diagnostic winner match does not grant calibration',()=>{
 const x=compareSavedRankedScores({results:[result]},{records:[capture]});
 assert.equal(x.comparable,1);assert.equal(x.diagnosticTopScoreFirstMatches,1);assert.equal(x.eligibleForCalibration,0);
});
test('invalid score and duplicate capture are excluded',()=>{
 const invalid={...capture,response:{ready:true,rankedScores:scores.map((x,i)=>i===0?{...x,score:NaN}:x)}};
 assert.equal(compareSavedRankedScores({results:[result]},{records:[invalid]}).comparable,0);
 assert.equal(compareSavedRankedScores({results:[result]},{records:[capture,capture]}).comparable,0);
});
test('tied top scores do not count as win diagnostic',()=>{
 const tied={...capture,response:{ready:true,rankedScores:scores.map((x,i)=>i===0?{...x,score:50}:x)}};
 assert.equal(compareSavedRankedScores({results:[result]},{records:[tied]}).comparable,0);
});
