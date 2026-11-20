#!/usr/bin/env node
// Offline CLI for pre-existing saved research records and independently verified results.
// Each item: {snapshot,recent50,officialResult,courseMapping}. Never fetches a result or prediction.
import fs from 'node:fs';
import {summarizeResearchFinishGaps} from './summarize-research-finish-gaps.mjs';
export function auditSavedResearchBatch(cases){
 const summary=summarizeResearchFinishGaps(cases);
 return {...summary,mode:'offline_saved_research_only'};
}
const invoked=process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url;
if(invoked){
 const input=process.argv[2];
 if(!input)throw Error('Usage: node scripts/audit-saved-research-batch.mjs cases.json');
 const cases=JSON.parse(fs.readFileSync(input,'utf8'));
 const output=auditSavedResearchBatch(cases);
 console.log(JSON.stringify(output,null,2));
 if(output.status==='held')process.exitCode=2;
}
