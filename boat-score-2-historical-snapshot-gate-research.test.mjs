import assert from 'node:assert/strict';
import {evaluateSnapshot,calibrate,BASE_WEIGHTS} from './boat-score-2-calibration.js';

// Historical finish order alone is not a verified pre-race feature snapshot.
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,nationalWinRate:6-i/3,localWinRate:5-i/3,
 motorTwoWinRate:40,recent50WinRate:30,exhibitionScore:50
}));
const sample=(date,race,overrides={})=>({
 date,venue:1,race,racers:racers.map(r=>({...r})),
 finishOrder:[1,2,3,4,5,6],preRaceSnapshot:true,resultVerified:true,...overrides
});
assert.equal(evaluateSnapshot(sample('20261118',1,{preRaceSnapshot:false}),BASE_WEIGHTS),null);
assert.equal(evaluateSnapshot(sample('20261118',1,{resultVerified:false}),BASE_WEIGHTS),null);
assert.equal(evaluateSnapshot(sample('20261118',1,{racers:racers.slice(0,5)}),BASE_WEIGHTS),null);
assert.equal(evaluateSnapshot(sample('20261118',1,{racers:racers.map((r,i)=>i===0?{...r,recent50WinRate:null}:r)}),BASE_WEIGHTS),null);
assert.equal(evaluateSnapshot(sample('20261118',1,{finishOrder:[1,1,3,4,5,6]}),BASE_WEIGHTS),null);
assert.equal(evaluateSnapshot(sample('20261118',1),BASE_WEIGHTS).winnerHit,true);
const retrospective=Array.from({length:12},(_,i)=>sample('20261118',i+1,{preRaceSnapshot:false}));
assert.equal(calibrate(retrospective).status,'insufficient_history');
const duplicate=[sample('20261118',1),sample('20261118',1)];
assert.equal(calibrate(duplicate,{minTrain:1,minTest:1}).status,'duplicate_races');
console.log('Historical pre-race snapshot safety gate research tests passed');
