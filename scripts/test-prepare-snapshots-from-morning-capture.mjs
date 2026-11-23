import assert from 'node:assert/strict';
import {prepareSnapshotsFromMorningCapture} from './prepare-snapshots-from-morning-capture.mjs';
const main=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const upset=[[4,5,6],[4,6,5],[5,4,6],[5,6,4],[6,4,5],[6,5,4]];
const record={date:'20261123',venue:1,race:1,httpStatus:200,
 requestedAt:'2026-11-23T01:49:00Z',receivedAt:'2026-11-23T01:50:00Z',
 responseSha256:'a'.repeat(64),response:{ready:true,main,upset}};
const capture={run:{workflowRunId:'fixture'},records:[record]};
const cutoffs={'20261123:1:1':'2026-11-23T02:00:00Z'};
const got=prepareSnapshotsFromMorningCapture(capture,cutoffs);
assert.equal(got.snapshots.length,1);
assert.equal(got.snapshots[0].main.length,6);
assert.equal(got.snapshots[0].independentlyAuthenticatedCapture,false);
assert.equal(got.snapshots[0].captureRunId,'fixture');
assert.equal(prepareSnapshotsFromMorningCapture(capture,{}).snapshots.length,0);
assert.equal(prepareSnapshotsFromMorningCapture(capture,{'20261123:1:1':'2026-11-23T01:40:00Z'}).snapshots.length,0);
assert.equal(prepareSnapshotsFromMorningCapture({...capture,records:[{...record,httpStatus:503}]},cutoffs).snapshots.length,0);
assert.equal(prepareSnapshotsFromMorningCapture({...capture,records:[null]},cutoffs).snapshots.length,0);
assert.equal(prepareSnapshotsFromMorningCapture({...capture,records:[{...record,receivedAt:null}]},cutoffs).snapshots.length,0);
console.log('Existing morning capture adapter fixture passed (not authenticated accuracy evidence)');
