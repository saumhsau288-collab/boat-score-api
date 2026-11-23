#!/usr/bin/env node
// Research-only: archive a ready API prediction from a JSON file before cutoff.
// Usage: node scripts/save-twelve-pick-capture.mjs api-response.json archive-directory
// The input JSON must contain selection, response, cutoffAt and optionally scoreInputs.
// This does not fetch live data, prove source authenticity, or change deployed workers.
import fs from 'node:fs';
import path from 'node:path';
import {prepareCaptureFromApiResponse} from './prepare-capture-from-api-response.mjs';
const [source,directory]=process.argv.slice(2);
if(!source||!directory||process.argv.length!==4){
 console.error('Usage: node scripts/save-twelve-pick-capture.mjs <response.json> <existing-archive-dir>');
 process.exitCode=2;
}else{
 try{
  const raw=JSON.parse(fs.readFileSync(source,'utf8'));
  const capturedAt=new Date().toISOString();
  const result=prepareCaptureFromApiResponse({...raw,capturedAt});
  if(result.status!=='prepared_not_authenticated')throw Error(result.status);
  const s=result.snapshot;
  const filename=[s.date,String(s.venue).padStart(2,'0'),String(s.race).padStart(2,'0'),capturedAt.replace(/[:.]/g,'-')].join('_')+'.json';
  const target=path.join(directory,filename);
  // Exclusive create: never overwrite a previously archived snapshot.
  fs.writeFileSync(target,JSON.stringify(s,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({status:'saved_unverified',file:target,authenticated:false}));
 }catch(error){console.error('Capture not saved:',error.message);process.exitCode=1;}
}
