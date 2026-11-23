#!/usr/bin/env node
// Research-only: inspect saved twelve-pick snapshots; never authenticate caller flags.
import fs from 'node:fs';
import path from 'node:path';
import {summarizeTwelvePickReadiness} from './summarize-twelve-pick-readiness.mjs';
import {explainTwelvePickArchiveRows} from './explain-twelve-pick-archive-rows.mjs';
export function inspectSavedTwelvePickDirectory(directory){
 const files=fs.readdirSync(directory).filter(n=>n.endsWith('.json')).sort();
 const rows=[],invalidFiles=[];
 for(const name of files){
  try{
   const value=JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('not_object');
   rows.push(value);
  }catch{invalidFiles.push(name);}
 }
 return {status:'research_only',filesScanned:files.length,parsedFiles:rows.length,
  invalidFiles,readiness:summarizeTwelvePickReadiness(rows),
  perRace:explainTwelvePickArchiveRows(rows).rows,
  note:'File contents and caller-supplied evidence flags are not independently authenticated.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const directory=process.argv[2];
 if(!directory||process.argv.length!==3){console.error('Usage: node scripts/inspect-saved-twelve-picks.mjs <existing-directory>');process.exitCode=2;}
 else try{console.log(JSON.stringify(inspectSavedTwelvePickDirectory(directory),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
