import assert from 'node:assert/strict';
import {buildVerifiedScoringInputs} from './boat-score-2-scoring-input-research.js';
import {validateOfficialMetrics} from './boat-score-2-official-metrics.js';
import {evaluateMorningFromSources} from './boat-score-2-morning-pipeline.js';
import {morningRacerScore} from './boat-score-2-morning.js';

// The research extractor currently verifies numeric metrics and racer IDs,
// but the existing official validator also requires a verified name and
// sourceVerified flag. Never invent those fields to make the validator pass.
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4201+i),nationalWinRate:4.4,localWinRate:i===0?0:4.7,
 motorTwoWinRate:39.48,averageSt:i===3?null:0.14
}));
const research=buildVerifiedScoringInputs({verified:true,racers});
assert.equal(research.ready,true);
const existing=validateOfficialMetrics(research.racers);
assert.equal(existing.verified,false);
assert.equal(existing.reason,'identity_or_source_unverified');
const morning=evaluateMorningFromSources({official:research.racers,recent50:[]});
assert.equal(morning.status,'insufficient_data');
assert.equal(morning.source,'official');
const score=morningRacerScore(research.racers[0]);
assert.equal(score.status,'insufficient_data');
assert.deepEqual(score.missing,['recent50WinRate']);
console.log('Research-to-existing-pipeline compatibility audit passed (integration still blocked)');
