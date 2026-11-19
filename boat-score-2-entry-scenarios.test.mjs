import test from 'node:test';import assert from 'node:assert/strict';
import {compareEntryScenarios} from './boat-score-2-entry-scenarios.js';
const racers=Array.from({length:6},(_,i)=>({nationalWinRate:6-i/10,localWinRate:6-i/10,averageStartTiming:.13+i/100}));
test('two entry assumptions produce separately labeled prediction sets',()=>{
 const r=compareEntryScenarios({date:'20261119',venue:18,race:2,racers,scenarios:[{label:'枠なり仮定',courses:[1,2,3,4,5,6]},{label:'6号艇が3コース',courses:[1,2,4,5,6,3]}]});
 assert.equal(r.scenarios.length,2);assert.equal(r.scenarios[0].main.length,6);assert.equal(r.scenarios[1].upset.length,6);
 assert.equal(r.scenarios[0].entryAlerts.length,0);assert.equal(r.scenarios[1].entryAlerts[0].boat,6);
});
test('duplicate entry courses are rejected',()=>{
 const r=compareEntryScenarios({racers,scenarios:[{courses:[1,2,3,4,5,5]}]});assert.equal(r.scenarios[0].status,'invalid_entry_courses');
});
