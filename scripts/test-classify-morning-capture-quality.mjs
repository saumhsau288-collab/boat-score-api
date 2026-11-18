#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'boat-quality-'));
try{
 const file=path.join(dir,'capture.json');
 const six=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
 const base={date:'20261118',venue:1};
 const records=[
 {...base,race:1,error:'timeout'},
 {...base,race:2,httpStatus:500},
 {...base,race:3,httpStatus:200,response:{ready:false}},
 {...base,race:4,httpStatus:200,response:{ready:true,main:[],upset:six}},
 {...base,race:5,httpStatus:200,response:{ready:true,main:six,upset:six}},
 {...base,race:6,httpStatus:200,response:{ready:true,main:six,upset:six,missingInputs:['wind']}},
 {...base,race:7,httpStatus:200,response:{ready:true,main:six,upset:six,missingInputs:[]}}
 ];
 fs.writeFileSync(file,JSON.stringify({date:'20261118',attempted:7,authenticatedBeforeRace:false,records}));
 const p=spawnSync(process.execPath,[new URL('./classify-morning-capture-quality.mjs',import.meta.url).pathname,file],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const r=JSON.parse(p.stdout);
 for(const [key,value] of Object.entries(r.counts))assert.equal(value,1,key);
 assert.equal(r.accuracyCalculationPermitted,false);
 assert.equal(r.groups.readyMissingInputs[0].missingInputs[0],'wind');
 console.log('Capture quality classification tests passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
