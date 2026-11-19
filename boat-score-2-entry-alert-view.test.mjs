import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEntryAlertPanel} from './boat-score-2-entry-alert-view.js';
import {analyzeEntryChanges} from './boat-score-2-entry-alerts.js';
const racers=[1,2,4,5,6,3].map((entryCourse,i)=>({boat:i+1,entryCourse}));
test('renders six boat inward movement with prediction caveat',()=>{
 const html=renderEntryAlertPanel(analyzeEntryChanges(racers));
 assert.match(html,/6号艇 → 3コース/);assert.match(html,/進入変動注意/);assert.match(html,/予想/);
});
test('shows neutral no-movement state',()=>{
 const html=renderEntryAlertPanel(analyzeEntryChanges([1,2,3,4,5,6].map((entryCourse,i)=>({boat:i+1,entryCourse}))));
 assert.match(html,/検出されていません/);
});
test('escapes untrusted message strings',()=>{
 const html=renderEntryAlertPanel({status:'evaluated',source:'prediction',alerts:[{boat:6,entryCourse:3,message:'<img src=x onerror=alert(1)>'}]});
 assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});
