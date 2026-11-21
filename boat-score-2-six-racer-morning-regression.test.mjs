import assert from 'node:assert/strict';
import {validateResearchRacersForExistingPipeline} from './boat-score-2-verified-official-bridge-research.js';
import {verifiedRecent50ForMorning} from './boat-score-2-recent50-morning-bridge-research.js';
import {evaluateMorningFromSources} from './boat-score-2-morning-pipeline.js';

// Research-only regression: six verified identities and metrics must join before scoring.
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4301+i),name:'Fixture Racer '+(i+1),
 nationalWinRate:6+i/10,localWinRate:i===0?0:5+i/10,
 motorTwoWinRate:40+i,averageSt:0.14
}));
const official=validateResearchRacersForExistingPipeline({verified:true,racers});
assert.equal(official.verified,true);
const joined={verified:true,racers:official.racers.map((r,i)=>({
 boat:r.boat,racerId:r.racerId,runs:50,firstPlaceRate:10+i*2
}))};
const adapted=verifiedRecent50ForMorning(official,joined);
assert.equal(adapted.ready,true);
const scored=evaluateMorningFromSources({official:official.racers,recent50:adapted.recent50});
assert.equal(scored.status,'evaluated');
assert.equal(scored.ranked.length,6);
assert.equal(official.racers[0].localWinRate,0);
assert.equal(scored.ranked.every(r=>Number.isFinite(r.score)),true);

// Never score a six-racer join when one identity or verification flag is wrong.
for(const broken of [
 {...joined,verified:false},
 {...joined,racers:joined.racers.map((r,i)=>i===0?{...r,racerId:'9999'}:r)},
 {...joined,racers:joined.racers.map((r,i)=>i===0?{...r,boat:2}:r)},
 {...joined,racers:joined.racers.slice(0,5)}
]){
 const check=verifiedRecent50ForMorning(official,broken);
 assert.equal(check.ready,false);
 assert.equal(check.recent50.length,0);
}
assert.equal(evaluateMorningFromSources({official:official.racers,recent50:[]}).status,'insufficient_data');
console.log('Research-only six-racer morning scoring regression passed');
