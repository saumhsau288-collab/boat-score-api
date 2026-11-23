#!/usr/bin/env node
// Run: node scripts/run-twelve-picks-audit.mjs path/to/verified-pre-race-picks.json
// Research-only. No live prediction or deployed weights are changed.
import fs from 'node:fs';
import {auditTwelvePicks} from './audit-twelve-picks-research.mjs';
const file=process.argv[2];
if(!file || process.argv.length!==3){
 console.error('Usage: node scripts/run-twelve-picks-audit.mjs <verified-picks.json>');
 process.exitCode=2;
}else{
 try{
  const rows=JSON.parse(fs.readFileSync(file,'utf8'));
  const result=auditTwelvePicks(rows);
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='evaluated')process.exitCode=1;
 }catch(e){console.error('Audit failed:',e.message);process.exitCode=1;}
}
