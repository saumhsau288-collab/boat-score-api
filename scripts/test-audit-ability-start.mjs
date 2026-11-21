import test from 'node:test';import assert from 'node:assert/strict';import {classifyAbilityAndStart,auditAbilityAndStart} from './audit-ability-start.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:i===0?8:i===4?7:4,averageStartTiming:i===0?.12:i===4?.18:.16}));
const row={date:'20261120',venue:1,race:1,resultVerified:true,asOfVerified:true,capturedBeforeStart:true,startTimingAsOfVerified:true,finishOrder:[1,5,2,3,4,6],racers};
test('classifies split ability and ST difference',()=>{const c=classifyAbilityAndStart(racers);assert.equal(c.placement,'splitInnerOuter');assert.equal(c.startTimingGroup,'moderate');assert.equal(c.fasterBoat,1);});
test('does not use ST without as-of verification',()=>{assert.equal(auditAbilityAndStart([{...row,startTimingAsOfVerified:false}]).eligible,0);const r=auditAbilityAndStart([row]);assert.equal(r.eligible,1);assert.equal(r.groups['splitInnerOuter:moderate'].bothTopThree,1);});
test('rejects missing ST',()=>assert.equal(classifyAbilityAndStart(racers.map((r,i)=>i===0?{...r,averageStartTiming:null}:r)),null));
