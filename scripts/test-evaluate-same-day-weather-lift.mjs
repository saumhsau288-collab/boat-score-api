import assert from 'node:assert/strict';
import {evaluateSameDayWeatherLift} from './evaluate-same-day-weather-lift.mjs';
const row=(date,race)=>({date,venue:'18',race,verified:true,actualWinnerBoat:4,
 baseWinnerBoat:1,weatherWinnerBoat:4,cutoffAt:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T15:00:00+09:00`,
 basePredictedAt:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T08:00:00+09:00`,
 weatherPredictedAt:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T14:00:00+09:00`,
 weatherEvidenceVerified:true,priorRacesOnlyVerified:true});
const rows=[row('20261119',7),row('20261119',8),row('20261120',7),row('20261120',8)];
const r=evaluateSameDayWeatherLift(rows,{minimumTrain:2,minimumHoldout:2});
assert.equal(r.status,'research_weather_lift_evaluated');
assert.equal(r.train.races,2);assert.equal(r.holdout.races,2);
assert.equal(r.holdoutWinRateLift,1);assert.equal(r.eligibleForDeployment,false);
const leak={...row('20261120',9),weatherPredictedAt:'2026-11-20T15:01:00+09:00'};
const filtered=evaluateSameDayWeatherLift([...rows,leak],{minimumTrain:2,minimumHoldout:2});
assert.equal(filtered.accepted,4);
assert.equal(filtered.excluded.invalid_or_unverified_cutoff_join,1);
assert.equal(evaluateSameDayWeatherLift(rows.slice(0,2),{minimumTrain:2,minimumHoldout:1}).status,'insufficient_verified_history');
console.log('Chronological weather prediction lift comparison tests passed');
