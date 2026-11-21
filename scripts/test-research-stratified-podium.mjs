import test from 'node:test';
import assert from 'node:assert/strict';
import {stratifyConditionalPodium} from './research-stratified-podium.mjs';
const boats=Array.from({length:6},(_,i)=>({boat:i+1,winRate:5,avgST:0.15}));
boats[5]={boat:6,winRate:6,avgST:0.10};
const row=(date,race,podium)=>({date,venue:1,race,podium,preRaceAuthenticated:true,preRace:boats});
test('stratifies second and third separately by pre-race gap',()=>{
 const x=stratifyConditionalPodium([row('20261118',1,[5,6,1]),row('20261119',1,[5,2,6])],'20261120');
 const g=x.rows.find(v=>v.winner===5&&v.candidate===6);
 assert.equal(g.ability,'higher');assert.equal(g.start,'faster');
 assert.equal(g.starts,2);assert.equal(g.second,1);assert.equal(g.third,1);
});
test('holds duplicate races, future dates, and unauthenticated snapshots',()=>{
 const r=row('20261118',1,[5,6,1]);
 const x=stratifyConditionalPodium([r,r,row('20261120',2,[5,6,1]),{...row('20261119',3,[5,6,1]),preRaceAuthenticated:false}],'20261120');
 assert.equal(x.held.duplicate_race,1);
 assert.equal(x.held.outside_training_window,1);
 assert.equal(x.held.unverified_pre_race,1);
 assert.equal(x.rows.find(v=>v.winner===5&&v.candidate===6).starts,1);
});

test('invalid first copy does not block a later authenticated race',()=>{
 const valid=row('20261118',4,[5,6,1]);
 const invalid={...valid,preRaceAuthenticated:false};
 const x=stratifyConditionalPodium([invalid,valid],'20261120');
 assert.equal(x.held.unverified_pre_race,1);
 assert.equal(x.held.duplicate_race??0,0);
 assert.equal(x.rows.find(v=>v.winner===5&&v.candidate===6).starts,1);
});
