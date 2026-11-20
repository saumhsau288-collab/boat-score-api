import assert from 'node:assert/strict';
import {summarizeHistoricalPredictionReviews as summarize} from './summarize-historical-prediction-reviews.mjs';
const make=(key,finish,verified=true)=>({
 evidenceAudit:{status:'evidence_fields_complete',readyForHistoricalCalibration:verified,raceKey:key},
 savedPrediction:{preRaceVerified:true,predictorVersionVerified:true,raceKey:key,rankedBoats:[1,2,3,4,5,6]},
 officialResult:{sourceVerified:true,raceKey:key,finishOrder:finish}
});
const data=[
 make('20261120-18-1',[1,2,3,4,5,6]),
 make('20261120-18-2',[2,1,3,4,5,6]),
 make('20261120-18-3',[3,2,1,4,5,6],false),
 make('20261120-18-4',[1,2,3,4,5,6]),
 make('20261120-18-4',[1,2,3,4,5,6])
];
const result=summarize(data);
assert.equal(result.total,5);
assert.equal(result.evaluable,2);
assert.equal(result.notEvaluable,3);
assert.equal(result.firstPlaceHits,1);
assert.equal(result.top3SetHits,2);
assert.equal(result.exactTop3OrderHits,1);
assert.equal(result.firstPlaceHitRatePercent,50);
assert.equal(result.top3SetHitRatePercent,100);
assert.equal(result.reviews[2].predictionMiss,false);
assert.equal(result.reviews[3].status,'not_evaluable');
assert.equal(result.reviews[4].status,'not_evaluable');
assert.equal(result.eligibleForCalibration,false);
assert.equal(result.scoreChangeApplied,false);
assert.equal(summarize([]).firstPlaceHitRatePercent,null);
assert.equal(summarize(null).status,'invalid_input');
console.log('Historical research batch summary tests passed');
