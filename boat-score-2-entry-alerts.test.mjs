import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeEntryChanges} from './boat-score-2-entry-alerts.js';
import {predictExperimentalRace} from './boat-score-2-offline-prediction.js';
const sample=(courses=[1,2,3,4,5,6])=>courses.map((entryCourse,i)=>({boat:i+1,entryCourse,nationalWinRate:5+i/10,localWinRate:5,averageStartTiming:.15}));
test('sixth boat entering third course creates high predicted alert',()=>{
 const r=analyzeEntryChanges(sample([1,2,4,5,6,3]));
 assert.equal(r.status,'evaluated');assert.equal(r.alerts.length,1);
 assert.equal(r.alerts[0].boat,6);assert.equal(r.alerts[0].entryCourse,3);
 assert.equal(r.alerts[0].severity,'high');assert.equal(r.alerts[0].confirmed,false);
 assert.match(r.alerts[0].message,/予想/);
});
test('exhibition alert is distinct from prediction and not a guarantee',()=>{
 const r=analyzeEntryChanges(sample([1,2,4,5,6,3]),{source:'exhibition'});
 assert.equal(r.alerts[0].confirmed,true);assert.match(r.note,/保証しません/);
});
test('normal entry has no alert; duplicate courses are rejected',()=>{
 assert.equal(analyzeEntryChanges(sample()).alerts.length,0);
 assert.equal(analyzeEntryChanges(sample([1,2,3,4,5,5])).status,'invalid_entry_courses');
});
test('prediction includes entry cautions and still provides six tickets per category',()=>{
 const r=predictExperimentalRace(sample([1,2,4,5,6,3]));
 assert.equal(r.status,'experimental');assert.equal(r.entryAlerts.alerts[0].boat,6);
 assert.equal(r.main.length,6);assert.equal(r.upset.length,6);
});
