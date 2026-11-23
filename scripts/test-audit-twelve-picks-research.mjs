import assert from 'node:assert/strict';
import {auditTwelvePicks} from './audit-twelve-picks-research.mjs';
const main=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset=[[4,5,6],[4,6,5],[5,4,6],[5,6,4],[6,4,5],[6,5,4]];
const row={date:'20261120',venue:1,race:1,actual:[1,2,3],main,upset,
 preRacePredictionsSaved:true,officialResultVerified:true,independentlyAuthenticatedCapture:true,
 predictionSourceUrl:'https://example.org/immutable-capture.json',
 officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult',officialCutoffVerified:true,
 predictionCapturedAt:'2026-11-20T01:00:00Z',cutoffAt:'2026-11-20T02:00:00Z'};
const got=auditTwelvePicks([row]);
assert.equal(got.status,'evaluated');
assert.equal(got.eligible,1);
assert.equal(got.main[0].hits,1);
assert.equal(got.main[1].hits,0);
assert.equal(got.mainAnyHits,1);
assert.equal(got.upsetAnyHits,0);
assert.equal(got.anyTwelveHits,1);
assert.equal(auditTwelvePicks([row,row]).eligible,1);
assert.equal(auditTwelvePicks([{...row,preRacePredictionsSaved:false}]).eligible,0);
assert.equal(auditTwelvePicks([{...row,main:[[1,1,2],...main.slice(1)]}]).eligible,0);
assert.equal(auditTwelvePicks([{...row,predictionCapturedAt:row.cutoffAt}]).eligible,0);
assert.equal(auditTwelvePicks([{...row,upset:[main[0],...upset.slice(1)]}]).eligible,0);
assert.equal(auditTwelvePicks([{...row,main:[main[0],main[0],...main.slice(2)]}]).eligible,0);
console.log('12-pick audit fixture tests passed (not historical accuracy evidence)');
