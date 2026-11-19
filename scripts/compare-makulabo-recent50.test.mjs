import test from 'node:test';
import assert from 'node:assert/strict';
import {compareMakulaboRecent50} from './compare-makulabo-recent50.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),nationalWinRate:6+i*.2,localWinRate:5+i*.2,averageStartTiming:.15,entryCourse:i+1}));
const recent=racers.map((r,i)=>({racerId:r.racerId,score:90-i*10}));
test('shows baseline and adjusted predictions when six racer IDs match',()=>{
 const r=compareMakulaboRecent50(racers,recent);
 assert.equal(r.applied,true);
 assert.equal(r.baseline.main.length,6);
 assert.equal(r.adjusted.main.length,6);
 assert.equal(r.adjusted.upset.length,6);
});
test('does not silently replace missing recent50 with zero',()=>{
 const r=compareMakulaboRecent50(racers,recent.map((x,i)=>i===0?{racerId:x.racerId}:x));
 assert.equal(r.applied,false);
 assert.equal(r.reason,'makulabo_score_missing_or_invalid');
});
test('does not apply another racer data',()=>{
 const r=compareMakulaboRecent50(racers,recent.map((x,i)=>i===0?{...x,racerId:'9999'}:x));
 assert.equal(r.applied,false);
 assert.equal(r.reason,'makulabo_identity_unverified');
});
