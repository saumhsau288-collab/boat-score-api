import assert from 'node:assert/strict';
import {calibrateExistingBoatScoreModule} from './calibrate-existing-boat-score-module.mjs';
const r=calibrateExistingBoatScoreModule([{date:'20261118',venue:2,race:1,boats:[],actual:[1,2,3]}]);
assert.equal(r.status,'blocked_unverified_history');
assert.equal(r.productionChanged,false);
const boats=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:6-i,localWinRate:i+1,motorTwoWinRate:40,recent50WinRate:30,exhibitionScore:50}));
const validRow=(date,race)=>({date,venue:1,race,boats,actual:[1,2,3],finishOrder:[1,2,3,4,5,6],
 independentlyVerifiedResult:true,historicalInputProvenanceVerified:true,
 historicalInputSourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist',
 officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult',
 historicalInputCapturedAt:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T08:00:00+09:00',
 officialCutoffAt:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T12:00:00+09:00'});
const rows=[validRow('20261101',1),validRow('20261102',1)];
const calibrated=calibrateExistingBoatScoreModule(rows,{minTrain:1,minTest:1});
assert.equal(calibrated.status,'evaluated');
assert.equal(calibrated.productionChanged,false);
assert.equal(calibrated.trainCount,1);
assert.equal(calibrated.testCount,1);
const missingFinish=calibrateExistingBoatScoreModule([{...rows[0],finishOrder:undefined},rows[1]],{minTrain:1,minTest:1});
assert.equal(missingFinish.status,'blocked_unverified_history');
assert.equal(missingFinish.missingVerifiedFullFinishOrder,true);
console.log('Existing Boat Score calibration bridge tests passed');
