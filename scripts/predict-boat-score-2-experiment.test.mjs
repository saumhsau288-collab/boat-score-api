import test from 'node:test';
import assert from 'node:assert/strict';
import {predictFromInput} from './predict-boat-score-2-experiment.mjs';
const racers=[1,2,4,5,6,3].map((entryCourse,i)=>({boat:i+1,entryCourse,nationalWinRate:6-i/5,localWinRate:6-i/5,averageStartTiming:.13+i/100}));
test('complete six-racer input produces ranking, 6+6 tickets and entry alert',()=>{
 const r=predictFromInput({venue:18,date:'20261119',race:2,racers});
 assert.equal(r.status,'experimental');assert.equal(r.ranking.length,6);
 assert.equal(r.main.length,6);assert.equal(r.upset.length,6);
 assert.equal(r.entryAlerts[0].boat,6);assert.equal(r.entryAlertSource,'prediction');
 assert.equal(new Set([...r.main,...r.upset].map(x=>x.ticket)).size,12);
});
test('invalid duplicate entry course never produces tickets',()=>{
 const bad=racers.map(x=>({...x}));bad[5].entryCourse=1;
 const r=predictFromInput({racers:bad});
 assert.notEqual(r.status,'experimental');assert.equal(r.main.length,0);assert.equal(r.upset.length,0);
});
