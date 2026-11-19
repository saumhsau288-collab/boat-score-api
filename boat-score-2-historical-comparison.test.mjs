import assert from 'node:assert/strict';
import {compareHistoricalRace,compareHistoricalSet} from './boat-score-2-historical-comparison.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:6,localWinRate:6,
 motorTwoWinRate:50,recent50WinRate:20,exhibitionScore:50,
 averageStartTiming:0.15,entryCourse:i+1}));
const row={date:'20261118',venue:1,race:1,preRaceSnapshot:true,resultVerified:true,
 racers,finishOrder:[1,2,3,4,5,6]};
assert.equal(compareHistoricalRace(row).status,'compared');
assert.equal(compareHistoricalSet([row]).eligible,1);
assert.equal(compareHistoricalSet([row,row]).status,'duplicate_races');
assert.equal(compareHistoricalSet([{...row,preRaceSnapshot:false}]).eligible,0);
assert.equal(compareHistoricalSet([{...row,racers:racers.map(r=>({...r,averageStartTiming:null}))}]).eligible,0);
console.log('Historical comparison structural tests passed (synthetic data only)');
