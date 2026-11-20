import assert from 'node:assert/strict';
import {evaluateWeatherRacerIdentityLift} from './evaluate-weather-racer-identity-lift.mjs';
const roster=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i)}));
const row=(date,race)=>({date,venue:'18',race,verified:true,preCutoffRacersByBoat:roster,
 rosterCapturedBeforeCutoff:true,actualWinnerBoat:4,officialWinnerRacerId:'4004',
 baseWinnerBoat:1,baseWinnerRacerId:'4001',weatherWinnerBoat:4,weatherWinnerRacerId:'4004',
 cutoffAt:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T15:00:00+09:00`,
 basePredictedAt:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T08:00:00+09:00`,
 weatherPredictedAt:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}T14:00:00+09:00`,
 weatherEvidenceVerified:true,priorRacesOnlyVerified:true});
const rows=[row('20261119',7),row('20261119',8),row('20261120',7),row('20261120',8)];
const result=evaluateWeatherRacerIdentityLift(rows,{minimumTrain:2,minimumHoldout:2});
assert.equal(result.status,'research_racer_identity_weather_lift');
assert.equal(result.identityJoined,4);
assert.equal(result.holdoutWinRateLift,1);
assert.equal(result.eligibleForDeployment,false);
const wrong={...row('20261120',9),officialWinnerRacerId:'4005'};
const rejected=evaluateWeatherRacerIdentityLift([...rows,wrong],{minimumTrain:2,minimumHoldout:2});
assert.equal(rejected.identityExcluded.racer_identity_or_roster_unverified,1);
assert.equal(rejected.identityJoined,4);
const wrongForecast={...row('20261120',10),weatherWinnerRacerId:'4002'};
assert.equal(evaluateWeatherRacerIdentityLift([...rows,wrongForecast],{minimumTrain:2,minimumHoldout:2}).identityExcluded.predicted_racer_identity_mismatch,1);
console.log('Weather prediction winner racer identity join tests passed');
