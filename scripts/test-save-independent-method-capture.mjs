import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createIndependentMethodCapture,saveIndependentMethodCapture} from './save-independent-method-capture.mjs';
const snapshot={date:'20261122',venue:2,race:1,preRaceSnapshot:{
 capturedAt:'2026-11-22T10:00:00+09:00',scheduledStartAt:'2026-11-22T10:10:00+09:00'},
 racers:Array.from({length:6},(_,i)=>({boat:i+1,entryCourse:i+1,nationalWinRate:7-i*.5,localWinRate:0,
 averageStartTiming:.13+i*.01,motorTwoRate:30+i*5,exhibitionTime:6.8-i*.03,last50CoursePodiumRate:20+i*10}))};
const timing={predictedAt:'2026-11-22T10:02:00+09:00',writtenAt:'2026-11-22T10:03:00+09:00'};
test('saved capture contains both six-racer snapshot and twelve unverified methods',()=>{
 const capture=createIndependentMethodCapture(snapshot,timing);
 assert.equal(capture.snapshot.racers.length,6);
 assert.equal(Object.keys(capture.prediction.methods).length,12);
 assert.equal(capture.prediction.preRaceVerified,false);
 assert.equal(capture.sourceAuthentication.status,'unverified');
});
test('never overwrites an existing capture or the source snapshot',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'research-capture-'));
 try{
  const input=join(dir,'snapshot.json'),output=join(dir,'capture.json');
  await writeFile(input,JSON.stringify(snapshot));
  await saveIndependentMethodCapture(input,output,timing);
  const saved=JSON.parse(await readFile(output,'utf8'));
  assert.equal(saved.prediction.methods['favorite-1'].trifecta.length,3);
  await assert.rejects(saveIndependentMethodCapture(input,output,timing),{code:'EEXIST'});
  await assert.rejects(saveIndependentMethodCapture(input,input,timing),/cannot overwrite source/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
