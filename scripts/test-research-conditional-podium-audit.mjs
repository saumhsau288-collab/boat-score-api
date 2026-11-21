import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionalPodiumAudit} from './research-conditional-podium-audit.mjs';
const preRace=Array.from({length:6},(_,i)=>({boat:i+1,winRate:5,avgST:0.15}));
const make=(date,podium,authenticated=true)=>({date,venue:1,podium,preRace,preRaceAuthenticated:authenticated});
test('conditional 2nd and 3rd frequencies use training dates only',()=>{
 const out=conditionalPodiumAudit([
  make('20261118',[5,6,1]),make('20261119',[5,2,6]),
  make('20261121',[5,6,2]),make('20261117',[5,6,1],false)
 ],'20261120');
 const pair=out.rows.find(x=>x.winner===5&&x.candidate===6);
 assert.equal(pair.starts,2);
 assert.equal(pair.second,1);
 assert.equal(pair.third,1);
 assert.equal(pair.secondRate,0.5);
 assert.equal(pair.thirdRate,0.5);
 assert.equal(out.held.outside_training_window,1);
 assert.equal(out.held.unverified_pre_race,1);
});
test('duplicate and malformed finish positions are excluded',()=>{
 const out=conditionalPodiumAudit([make('20261118',[1,1,3]),make('20261118',[1,2,7])],'20261120');
 assert.equal(out.rows.length,0);
 assert.equal(out.held.invalid_podium,2);
});
