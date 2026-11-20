import assert from 'node:assert/strict';
import {buildScoreCapture,verifySourceRunProvenance,verifySourceArtifactProvenance} from './capture-research-precutoff-score.mjs';
const now='2026-11-20T08:05:00+09:00';
const base={race:{date:'20261120',venue:18,race:1},cutoffAt:'2026-11-20T09:00:00+09:00',capturedAt:'2026-11-20T08:00:00+09:00',officialSourceVerified:true,cutoffSourceVerified:true,archivedBeforeCutoffVerified:true,sourceEvidenceSha256:'a'.repeat(64),racers:Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4551+i),sourceVerified:true,nationalWinRate:5,localWinRate:5,motorTwoWinRate:40,recent50WinRate:20,exhibitionScore:50}))};
assert.equal(buildScoreCapture(base,now).status,'research_score_captured');
assert.equal(buildScoreCapture(base,now).receipt.scores.length,6);
assert.equal(buildScoreCapture(base,'2026-11-20T09:01:00+09:00').status,'held');
assert.equal(buildScoreCapture({...base,archivedBeforeCutoffVerified:false},now).status,'held');
assert.equal(buildScoreCapture({...base,racers:base.racers.map((r,i)=>i===0?{...r,recent50WinRate:undefined}:r)},now).status,'held');
assert.equal(buildScoreCapture({...base,racers:base.racers.map((r,i)=>i===0?{...r,racerId:'4560',sourceVerified:false}:r)},now).status,'held');
console.log('Research pre-cutoff score capture tests passed');

const provenance={id:123,created_at:'2026-11-19T22:00:00Z',run_started_at:'2026-11-19T22:01:00Z',conclusion:'success',head_sha:'a'.repeat(40)};
assert.equal(verifySourceRunProvenance(base,provenance),true);
assert.equal(verifySourceRunProvenance(base,{...provenance,created_at:'2026-11-20T01:00:00Z'}),false);
assert.equal(verifySourceRunProvenance(base,{...provenance,conclusion:'failure'}),false);

const artifact={id:456,name:'pre-race-evidence',created_at:'2026-11-19T22:02:00Z',expired:false,workflow_run:{id:123}};
assert.equal(verifySourceArtifactProvenance(base,artifact,provenance),true);
assert.equal(verifySourceArtifactProvenance(base,{...artifact,created_at:'2026-11-20T00:01:00Z'},provenance),false);
assert.equal(verifySourceArtifactProvenance(base,{...artifact,workflow_run:{id:999}},provenance),false);
assert.equal(verifySourceArtifactProvenance(base,{...artifact,expired:true},provenance),false);
