import test from 'node:test';
import assert from 'node:assert/strict';
import {predictExperimentalRace} from './boat-score-2-offline-prediction.js';
import {buildEntryAlertView} from './boat-score-2-entry-alert-integration.js';
const racers=[1,2,4,5,6,3].map((entryCourse,i)=>({boat:i+1,entryCourse,nationalWinRate:5,localWinRate:5,averageStartTiming:.15}));
test('predicted inward movement appears in preview',()=>{
 const p=predictExperimentalRace(racers),view=buildEntryAlertView(p);
 assert.equal(view.status,'ready');assert.equal(view.source,'prediction');assert.match(view.html,/6号艇 → 3コース/);
});
test('valid exhibition entry supersedes prediction alert',()=>{
 const p=predictExperimentalRace(racers);
 const exhibition=[1,2,3,4,6,5].map((entryCourse,i)=>({boat:i+1,entryCourse}));
 const view=buildEntryAlertView(p,{exhibitionRacers:exhibition,exhibitionSourceVerified:true});
 assert.equal(view.source,'exhibition');assert.match(view.html,/6号艇 → 5コース/);
});
test('invalid exhibition is rejected, prediction warning remains',()=>{
 const p=predictExperimentalRace(racers);
 const view=buildEntryAlertView(p,{exhibitionRacers:[{boat:6,entryCourse:3}]});
 assert.equal(view.source,'prediction');assert.equal(view.exhibitionRejected,true);
});

test('unverified exhibition data cannot override prediction warning',()=>{
 const p=predictExperimentalRace(racers);
 const exhibition=[1,2,3,4,6,5].map((entryCourse,i)=>({boat:i+1,entryCourse}));
 const view=buildEntryAlertView(p,{exhibitionRacers:exhibition});
 assert.equal(view.source,'prediction');assert.equal(view.exhibitionRejected,true);
 assert.match(view.html,/6号艇 → 3コース/);
});
