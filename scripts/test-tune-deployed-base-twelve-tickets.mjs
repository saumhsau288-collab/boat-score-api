import assert from 'node:assert/strict';
import {tuneDeployedBaseTwelveTickets} from './tune-deployed-base-twelve-tickets.mjs';
const empty=tuneDeployedBaseTwelveTickets([]);
assert.equal(empty.status,'insufficient_verified_history');
const row={date:'20261101',venue:1,race:1,stats:Array.from({length:6},(_,i)=>({boat:i+1,win:9-i,motor:60-i*5,local:8-i,top2:70-i*5,top3:80-i*5})),
 actual:[1,2,3],independentlyVerifiedResult:true,historicalInputProvenanceVerified:true,historicalInputSourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist',officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult',historicalInputCapturedAt:'2026-11-01T08:00:00+09:00',officialCutoffAt:'2026-11-01T12:00:00+09:00'};
const rows=[row,{...row,date:'20261102',historicalInputCapturedAt:'2026-11-02T08:00:00+09:00',officialCutoffAt:'2026-11-02T12:00:00+09:00'}];
const x=tuneDeployedBaseTwelveTickets(rows,{minTrain:1,minTest:1});
assert.equal(x.status,'evaluated');assert.equal(x.testCount,1);
assert.equal(x.holdoutEitherHitDelta,0);assert.equal(x.productionChanged,false);
assert.equal(tuneDeployedBaseTwelveTickets([row,row]).status,'duplicate_races');
console.log('Time-split deployed 12-ticket tuning fixtures passed');
