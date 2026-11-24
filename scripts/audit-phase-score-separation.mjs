import assert from 'node:assert/strict';
import {morningRacerScore} from '../boat-score-2-morning.js';
import {evaluateRacer} from '../boat-score-2-scoring.js';
// Synthetic regression audit only; no historical accuracy claims.
const base={nationalWinRate:6,localWinRate:4,motorTwoWinRate:40,recent50WinRate:35,exhibitionScore:50,startTiming:.15};
const morning=morningRacerScore(base);
const prestart=evaluateRacer(base);
assert.equal(morning.status,'evaluated');
assert.equal(prestart.status,'evaluated');
assert.equal(morningRacerScore({...base,exhibitionScore:undefined}).score,morning.score);
assert.equal(evaluateRacer({...base,exhibitionScore:undefined}).status,'insufficient_data');
assert.equal(morningRacerScore({...base,localWinRate:0}).score,morningRacerScore({...base,localWinRate:6}).score);
const findings={
 syntheticOnly:true,
 morningIgnoresStartTiming:morningRacerScore({...base,startTiming:.25}).score===morning.score,
 prestartIgnoresStartTiming:evaluateRacer({...base,startTiming:.25}).score===prestart.score,
 morningIgnoresExhibition:morningRacerScore({...base,exhibitionScore:90}).score===morning.score,
 prestartUsesExhibition:evaluateRacer({...base,exhibitionScore:90}).score!==prestart.score
};
console.log(JSON.stringify(findings,null,2));
