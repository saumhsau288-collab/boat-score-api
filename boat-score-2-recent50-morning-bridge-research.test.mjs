import assert from 'node:assert/strict';
import {validateResearchRacersForExistingPipeline} from './boat-score-2-verified-official-bridge-research.js';
import {verifiedRecent50ForMorning} from './boat-score-2-recent50-morning-bridge-research.js';
import {evaluateMorningFromSources} from './boat-score-2-morning-pipeline.js';
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4201+i),name:'Test Racer '+(i+1),
 nationalWinRate:4.4,localWinRate:i===0?0:4.7,
 motorTwoWinRate:39.48,averageSt:i===3?null:0.14
}));
const official=validateResearchRacersForExistingPipeline({verified:true,racers});
assert.equal(official.verified,true,JSON.stringify(official));
const joined={verified:true,racers:official.racers.map(r=>({
 boat:r.boat,racerId:r.racerId,runs:50,firstPlaceRate:20
}))};
const adapted=verifiedRecent50ForMorning(official,joined);
assert.equal(adapted.ready,true,JSON.stringify(adapted));
const result=evaluateMorningFromSources({official:official.racers,recent50:adapted.recent50});
assert.equal(result.status,'evaluated',JSON.stringify(result));
assert.equal(verifiedRecent50ForMorning(official,{...joined,verified:false}).ready,false);
assert.equal(verifiedRecent50ForMorning(official,{...joined,racers:joined.racers.map((r,i)=>i===0?{...r,runs:51}:r)}).ready,false);
assert.equal(verifiedRecent50ForMorning(official,{...joined,racers:joined.racers.map((r,i)=>i===0?{...r,racerId:'9999'}:r)}).ready,false);
console.log('Research verified recent50-to-morning pipeline tests passed');
