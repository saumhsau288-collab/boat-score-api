#!/usr/bin/env node
// Usage: node scripts/run-research-retrospective-finish-ranks.mjs path/to/research-review.json
// Offline only; does not alter scores, train, deploy or fetch retrospective predictions.
import fs from 'node:fs';
import {summarizeRetrospectiveFinishRanks} from './research-retrospective-finish-ranks.mjs';
const paths=process.argv.slice(2);
if(!paths.length){console.error('Provide at least one saved research-review JSON file');process.exit(2);}
const records=[];
for(const path of paths){
 const payload=JSON.parse(fs.readFileSync(path,'utf8'));
 if(payload?.status!=='research_only_batch_review'||!Array.isArray(payload.records))
  throw Error('Not a saved research-only batch review: '+path);
 records.push(...payload.records);
}
const result=summarizeRetrospectiveFinishRanks(records);
if(result.compared===0){
 console.error('No comparable retrospective races. Report is held; do not claim accuracy.');
 process.exitCode=3;
}
console.log(JSON.stringify(result,null,2));
if(process.env.GITHUB_STEP_SUMMARY){
 const fmt=p=>p.rankCounts.map((count,i)=>(i+1)+':'+count).join(', ');
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '\n## Retrospective finish-rank diagnostics (not a pre-race backtest)\n'+
  'Compared: '+result.compared+'\n\n'+
  result.positions.map(p=>'- Finish '+p.finish+': '+fmt(p)).join('\n')+'\n');
}
