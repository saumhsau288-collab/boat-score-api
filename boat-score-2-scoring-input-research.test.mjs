import assert from 'node:assert/strict';
import {buildVerifiedScoringInputs} from './boat-score-2-scoring-input-research.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4201+i),
 nationalWinRate:4+i/10,localWinRate:i===0?0:5+i/10,motorTwoWinRate:35+i,
 averageSt:i===3?null:0.15}));
const good=buildVerifiedScoringInputs({verified:true,racers});
assert.equal(good.ready,true,JSON.stringify(good));
assert.equal(good.racers[0].effectiveLocalWinRate,4);
assert.equal(good.racers[0].racerWinRate,4);
assert.equal(good.racers[1].racerWinRate,(4.1+5.1)/2);
assert.equal(good.racers[3].averageSt,null);
assert.equal(good.racers[3].averageStAvailable,false);
assert.equal(buildVerifiedScoringInputs({verified:false,racers}).ready,false);
assert.equal(buildVerifiedScoringInputs({verified:true,racers:racers.slice(0,5)}).ready,false);
assert.equal(buildVerifiedScoringInputs({verified:true,racers:[...racers.slice(0,5),racers[0]]}).ready,false);
console.log('Verified scoring-input bridge research tests passed');
