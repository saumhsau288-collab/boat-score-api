#!/usr/bin/env node
// Research-only strict archival of a provided API response and original inputs.
// Does not fetch data, authenticate sources, or alter deployed workers.
// Usage: node scripts/save-original-input-capture.mjs response.json existing-archive-dir
import fs from 'node:fs';
import path from 'node:path';
import {prepareCaptureWithOriginalInputs} from './prepare-capture-with-original-inputs.mjs';
export function saveOriginalInputCapture(raw,directory,capturedAt=new Date().toISOString()){
 const result=prepareCaptureWithOriginalInputs({...raw,capturedAt});
 if(result.status!=='prepared_not_authenticated')return {status:result.status,errors:result.errors??[]};
 const s=result.snapshot;
 const name=[s.date,String(s.venue).padStart(2,'0'),String(s.race).padStart(2,'0'),capturedAt.replace(/[:.]/g,'-')].join('_')+'.json';
 const target=path.join(directory,name);
 fs.writeFileSync(target,JSON.stringify(s,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:'saved_unverified',file:target,authenticated:false,originalInputsPresent:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const [source,directory]=process.argv.slice(2);
 if(!source||!directory||process.argv.length!==4){
  console.error('Usage: node scripts/save-original-input-capture.mjs <response.json> <existing-archive-dir>');
  process.exitCode=2;
 }else{
  try{const result=saveOriginalInputCapture(JSON.parse(fs.readFileSync(source,'utf8')),directory);
   console.log(JSON.stringify(result));if(result.status!=='saved_unverified')process.exitCode=1;
  }catch(e){console.error('Capture not saved:',e.message);process.exitCode=1;}
 }
}
