import assert from 'node:assert/strict';
import {evaluateMorningRankingHistory,isValidMorningCaptureTimestamp,isCaptureOnMorningDate} from './evaluate-morning-ranking-history.mjs';
const order=[1,2,3,4,5,6];
const pick=(category,race)=>({date:'20261122',venue:1,race,category,status:'provisional_not_calibrated',predictedOrder:order});
const snapshot={date:'20261122',categories:{main:[pick('main',1)],upset:[pick('upset',2)],chaos:[]}};
const result=(race,finish)=>({date:'20261122',venue:1,race,resultVerified:true,officialFinish:finish});
const r=evaluateMorningRankingHistory(snapshot,[result(1,order)]);
assert.equal(r.notTwelveMethods,true);
assert.equal(r.byCategory.main.matched,1);
assert.equal(r.byCategory.main.topThreeExactHits,1);
assert.deepEqual(r.exclusionObservations['1:1'],{rank:1,boat:1,races:1,firstHits:1,topTwoHits:1});
assert.deepEqual(r.exclusionObservations['6:6'],{rank:6,boat:6,races:1,firstHits:0,topTwoHits:0});
assert.equal(r.byCategory.upset.matched,0);
assert.equal(r.byCategory.upset.firstRate,null);
assert.throws(()=>evaluateMorningRankingHistory(snapshot,[{...result(1,order),resultVerified:false}]),/Unverified/);
assert.throws(()=>evaluateMorningRankingHistory(snapshot,[result(1,order),result(1,order)]),/Duplicate official/);
assert.throws(()=>evaluateMorningRankingHistory({...snapshot,categories:{...snapshot.categories,upset:[pick('upset',1)]}},[result(1,order)]),/Duplicate ranked/);
assert.throws(()=>evaluateMorningRankingHistory(snapshot,[result(1,[1,1,3,4,5,6])]),/Unverified/);
const malformed={...snapshot,categories:{...snapshot.categories,main:[{...pick('main',1),predictedOrder:[1,2,3]}]}};
assert.throws(()=>evaluateMorningRankingHistory(malformed,[]),/Invalid saved morning ranking:.*"predictedOrder":\[1,2,3\]/);
const legacy={...snapshot,categories:{...snapshot.categories,main:[((({predictedOrder,...rest})=>rest)(pick('main',1)))]}};
const skipped=evaluateMorningRankingHistory(legacy,[result(1,order)]);
assert.equal(skipped.byCategory.main.saved,1);
assert.equal(skipped.byCategory.main.missingPredictionOrder,1);
assert.equal(skipped.byCategory.main.matched,0);
assert.equal(skipped.byCategory.main.firstRate,null);
assert.deepEqual(skipped.exclusionObservations,{});
const mixed={...snapshot,categories:{...snapshot.categories,main:[pick('main',1),((({predictedOrder,...rest})=>({...rest,race:3}))(pick('main',3)))]}};
const mixedResult=evaluateMorningRankingHistory(mixed,[result(1,order),result(3,order)]);
assert.equal(mixedResult.byCategory.main.matched,1);
assert.equal(mixedResult.byCategory.main.missingPredictionOrder,1);
assert.equal(mixedResult.byCategory.main.firstRate,1);

const capture='2026-11-22T23:00:00.000Z'; // 08:00 JST, November 23
assert.equal(isValidMorningCaptureTimestamp(capture),true);
assert.equal(isValidMorningCaptureTimestamp('2026-11-22 23:00:00'),false);
assert.equal(isValidMorningCaptureTimestamp('invalid'),false);
assert.equal(isCaptureOnMorningDate(capture,'20261123'),true);
assert.equal(isCaptureOnMorningDate('2026-11-22T14:59:59.999Z','20261123'),false);
assert.equal(isCaptureOnMorningDate('2026-11-23T14:59:59.999Z','20261123'),true);
assert.equal(isCaptureOnMorningDate('2026-11-23T15:00:00.000Z','20261123'),false);
const tomorrowPick=(category,race,additional={})=>({
 ...pick(category,race),date:'20261123',capturedAt:capture,...additional
});
const nextSnapshot={date:'20261123',categories:{
 main:[tomorrowPick('main',1),tomorrowPick('main',3,{capturedAt:undefined})],
 upset:[tomorrowPick('upset',2,{predictedOrder:undefined})],
 chaos:[]
}};
const nextResult=(race)=>({...result(race,order),date:'20261123'});
const nextEval=evaluateMorningRankingHistory(nextSnapshot,[nextResult(1),nextResult(3),nextResult(2)]);
assert.equal(nextEval.byCategory.main.saved,2);
assert.equal(nextEval.byCategory.main.matched,1);
assert.equal(nextEval.byCategory.main.missingCaptureTimestamp,1);
assert.equal(nextEval.byCategory.main.notEvaluable,1);
assert.equal(nextEval.byCategory.main.firstRate,1);
assert.equal(nextEval.exclusionObservations['1:1'].races,1);
const wrongDay={...nextSnapshot,categories:{...nextSnapshot.categories,main:[
 tomorrowPick('main',1,{capturedAt:'2026-11-23T15:00:00.000Z'})
]}};
const wrongDayEval=evaluateMorningRankingHistory(wrongDay,[nextResult(1)]);
assert.equal(wrongDayEval.byCategory.main.matched,0);
assert.equal(wrongDayEval.byCategory.main.missingCaptureTimestamp,1);
assert.equal(wrongDayEval.byCategory.main.firstRate,null);
assert.equal(nextEval.byCategory.upset.matched,0);
assert.equal(nextEval.byCategory.upset.missingPredictionOrder,1);
assert.equal(nextEval.byCategory.upset.notEvaluable,1);
assert.equal(nextEval.byCategory.upset.firstRate,null);
const bothMissing={...nextSnapshot,categories:{...nextSnapshot.categories,main:[
 tomorrowPick('main',1,{capturedAt:undefined,predictedOrder:undefined})
]}};
const bothEval=evaluateMorningRankingHistory(bothMissing,[]);
assert.equal(bothEval.byCategory.main.missingCaptureTimestamp,1);
assert.equal(bothEval.byCategory.main.missingPredictionOrder,1);
assert.equal(bothEval.byCategory.main.notEvaluable,1); // do not double-count missing evidence
assert.equal(bothEval.byCategory.main.unmatched,0);
assert.deepEqual(bothEval.exclusionObservations,{});
const deadlineOk=evaluateMorningRankingHistory({...nextSnapshot,categories:{
 main:[tomorrowPick('main',1,{deadlineAt:'2026-11-22T23:05:00.000Z'})],upset:[],chaos:[]
}},[nextResult(1)]);
assert.equal(deadlineOk.byCategory.main.matched,1);
const deadlineLate=evaluateMorningRankingHistory({...nextSnapshot,categories:{
 main:[tomorrowPick('main',1,{deadlineAt:capture})],upset:[],chaos:[]
}},[nextResult(1)]);
assert.equal(deadlineLate.byCategory.main.matched,0);
assert.equal(deadlineLate.byCategory.main.afterDeadline,1);
assert.equal(deadlineLate.byCategory.main.notEvaluable,1);
assert.deepEqual(deadlineLate.exclusionObservations,{});
const deadlineInvalid=evaluateMorningRankingHistory({...nextSnapshot,categories:{
 main:[tomorrowPick('main',1,{deadlineAt:'invalid'})],upset:[],chaos:[]
}},[nextResult(1)]);
assert.equal(deadlineInvalid.byCategory.main.afterDeadline,1);
assert.equal(deadlineInvalid.byCategory.main.matched,0);
console.log('Morning saved-ranking evaluator: verified match, unmatched abstain, five invalid-input guards, legacy exclusion and capture-time denominators passed. No real-race accuracy claimed.');
