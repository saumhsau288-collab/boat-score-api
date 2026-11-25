import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {saveLockedProspectivePrediction} from './save-locked-prospective-prediction.mjs';
import {evaluateSavedProspectivePredictions} from './evaluate-saved-prospective-predictions.mjs';
const capture={venue:2,date:'20261122',race:3,sourceUrl:'https://example.org/official',capturedAt:'2026-11-22T10:00:00+09:00',scheduledStartAt:'2026-11-22T10:10:00+09:00',racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,averageStartTiming:.15}))};
const verification={verified:true,sourceUrl:capture.sourceUrl,verifiedAt:'2026-11-22T10:01:00+09:00',method:'externally reviewed'};
const p={date:'20261122',venue:2,race:3,capture,verification,ruleVersion:'inner-challenger-frozen-20261122',predictedAt:'2026-11-22T10:02:00+09:00',predictedFirst:1,predictedTrifecta:[1,2,3]};
test('saved prediction is read and joined only with verified result',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'boat-join-'));
 try{
  await saveLockedProspectivePrediction(dir,p,{now:()=>new Date('2026-11-22T10:03:00+09:00')});
  const result={date:'20261122',venue:2,race:3,resultVerified:true,finishOrder:[1,2,3,4,5,6]};
  const r=await evaluateSavedProspectivePredictions(dir,[result]);
  assert.equal(r.filesRead,1,JSON.stringify(r));assert.equal(r.matched,1,JSON.stringify(r));assert.equal(r.exactTrifecta,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('mismatched filename is rejected rather than silently joined',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'boat-join-'));
 try{
  await writeFile(join(dir,'20261122-02-04.json'),JSON.stringify(p));
  await assert.rejects(evaluateSavedProspectivePredictions(dir,[]),/filename does not match/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
