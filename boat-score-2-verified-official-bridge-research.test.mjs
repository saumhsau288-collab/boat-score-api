import assert from 'node:assert/strict';
import {validateResearchRacersForExistingPipeline} from './boat-score-2-verified-official-bridge-research.js';
import {evaluateMorningFromSources} from './boat-score-2-morning-pipeline.js';
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4201+i),name:'Test Racer '+(i+1),
 nationalWinRate:4.4,localWinRate:i===0?0:4.7,
 motorTwoWinRate:39.48,averageSt:i===3?null:0.14
}));
const validated=validateResearchRacersForExistingPipeline({verified:true,racers});
assert.equal(validated.verified,true,JSON.stringify(validated));
assert.equal(validated.racers[0].name,'Test Racer 1');
assert.equal(validated.racers[0].localWinRate,0);
const missingName=validateResearchRacersForExistingPipeline({verified:true,racers:racers.map((r,i)=>i===0?{...r,name:null}:r)});
assert.equal(missingName.verified,false);
assert.equal(missingName.reason,'verified_racer_name_required');
const morning=evaluateMorningFromSources({official:validated.racers,recent50:[]});
assert.equal(morning.status,'insufficient_data');
assert.equal(morning.source,'recent50');
console.log('Verified research official-to-existing pipeline bridge tests passed');
