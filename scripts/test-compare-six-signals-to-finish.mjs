import assert from 'node:assert/strict';
import {compareSixSignalsToFinish} from './compare-six-signals-to-finish.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,
 nationalWinRate:5+i*.5,localWinRate:5+i*.5,motorTwoWinRate:40,
 recent50WinRate:40,exhibitionScore:50,startTiming:.20-i*.02}));
const data={racers,finishOrder:[6,1,5,2,3,4]};
assert.equal(compareSixSignalsToFinish(data).status,'unverified_evidence');
assert.equal(compareSixSignalsToFinish({...data,preRaceCaptured:true}).status,'unverified_evidence');
assert.equal(compareSixSignalsToFinish({...data,finishOrder:[6,6,5,2,3,4]}).status,'invalid_finish_order');
const result=compareSixSignalsToFinish({...data,preRaceCaptured:true,officialResultVerified:true});
assert.equal(result.status,'research_only');
assert.equal(result.rows.length,6);
assert.equal(result.rows.find(r=>r.boat===6).finishPosition,1);
assert.equal(result.groupStats.favorites.podiumHits,2);
assert.equal(result.groupStats.counterCandidates.winnerIncluded,true);
assert.equal(result.signalStats.course.podiumHits,1);
assert.equal(compareSixSignalsToFinish({...data,preRaceCaptured:true,officialResultVerified:true,
 racers:racers.map(r=>r.boat===2?{...r,startTiming:null}:r)}).status,'insufficient_input');
console.log('Finish comparison synthetic fixtures passed; evidence assertions are not authenticated');
