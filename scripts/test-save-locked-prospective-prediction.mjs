import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {saveLockedProspectivePrediction} from './save-locked-prospective-prediction.mjs';
const capture={venue:2,date:'20261122',race:3,sourceUrl:'https://example.org/official',capturedAt:'2026-11-22T10:00:00+09:00',scheduledStartAt:'2026-11-22T10:10:00+09:00',racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,averageStartTiming:.15}))};
const verification={verified:true,sourceUrl:capture.sourceUrl,verifiedAt:'2026-11-22T10:01:00+09:00',method:'externally reviewed'};
const p={date:'20261122',venue:2,race:3,capture,verification,ruleVersion:'inner-challenger-frozen-20261122',predictedAt:'2026-11-22T10:02:00+09:00',predictedFirst:1,predictedTrifecta:[1,2,3]};
test('creates once and refuses overwrite of locked prediction',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'boat-locked-'));
 try{
  const a=await saveLockedProspectivePrediction(dir,p,{now:()=>new Date('2026-11-22T10:03:00+09:00')});
  assert.equal(JSON.parse(await readFile(a.path,'utf8')).predictedFirst,1);
  await assert.rejects(saveLockedProspectivePrediction(dir,{...p,predictedTrifecta:[1,3,2]},{now:()=>new Date('2026-11-22T10:03:00+09:00')}),{code:'EEXIST'});
  assert.deepEqual(JSON.parse(await readFile(a.path,'utf8')).predictedTrifecta,[1,2,3]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('rejects missing independent source verification',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'boat-locked-'));
 try{await assert.rejects(saveLockedProspectivePrediction(dir,{...p,verification:null},{now:()=>new Date('2026-11-22T10:03:00+09:00')}),/not admitted/);}
 finally{await rm(dir,{recursive:true,force:true});}
});

test('refuses write after scheduled start despite backdated predictedAt',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'boat-locked-'));
 try{await assert.rejects(saveLockedProspectivePrediction(dir,p,{now:()=>new Date('2026-11-22T10:11:00+09:00')}),/write must occur/);}
 finally{await rm(dir,{recursive:true,force:true});}
});
