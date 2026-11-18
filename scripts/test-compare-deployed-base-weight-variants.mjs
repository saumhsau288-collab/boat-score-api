import assert from 'node:assert/strict';
import {compareDeployedBaseWeightVariants} from './compare-deployed-base-weight-variants.mjs';
import {DEPLOYED_BASE_WEIGHTS} from './replay-deployed-base-tickets.mjs';
const stats=Array.from({length:6},(_,i)=>({boat:i+1,win:9-i,motor:60-i*5,local:8-i,top2:70-i*5,top3:80-i*5}));
const row={date:'20261101',venue:1,race:1,stats,actual:[1,2,3],independentlyVerifiedResult:true,historicalInputProvenanceVerified:true,
 historicalInputSourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist',
 officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult',
 historicalInputCapturedAt:'2026-11-01T08:00:00+09:00',officialCutoffAt:'2026-11-01T12:00:00+09:00'};
const x=compareDeployedBaseWeightVariants([row],DEPLOYED_BASE_WEIGHTS);
assert.equal(x.status,'evaluated');assert.equal(x.eligible,1);
assert.equal(x.baseline.mainHits,1);assert.deepEqual(x.baseline,x.candidate);
const y=compareDeployedBaseWeightVariants([{...row,historicalInputCapturedAt:'2026-11-01T13:00:00+09:00'}],DEPLOYED_BASE_WEIGHTS);
assert.equal(y.eligible,0);assert.equal(y.excluded.length,1);
assert.equal(compareDeployedBaseWeightVariants([row],{...DEPLOYED_BASE_WEIGHTS,national:100}).status,'invalid_input');
console.log('Actual deployed base 12-ticket comparison fixtures passed');
