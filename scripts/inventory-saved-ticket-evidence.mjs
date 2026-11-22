#!/usr/bin/env node
// Read-only inventory of local evidence pairs. No external API, no retroactive prediction.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateEligibleSavedTicketSlots} from './evaluate-eligible-saved-ticket-slots.mjs';
const root=process.argv[2]??'prediction-captures';
const entries=fs.existsSync(root)?fs.readdirSync(root).filter(x=>x.endsWith('.json')):[];
const pairs=[];
for(const file of entries){
 const match=/^(20\d{6})-\d+\.json$/.exec(file);
 if(!match)continue;
 const date=match[1];
 const resultsName=date+'-verified-official-results.json';
 if(!entries.includes(resultsName)){pairs.push({capture:file,officialResults:null,compared:0,status:'missing_separate_official_results'});continue;}
 try{
  const capture=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(root,resultsName),'utf8'));
  if(!Array.isArray(evidence.results))throw Error('missing results[]');
  const report=evaluateEligibleSavedTicketSlots(capture,evidence.results);
  pairs.push({capture:file,officialResults:resultsName,compared:report.compared,held:report.held,holdReasons:report.holdReasons,coverage:report.coverage,status:report.compared?'eligible_claims_require_external_authentication':'no_eligible_comparisons'});
 }catch(e){pairs.push({capture:file,officialResults:resultsName,compared:0,status:'invalid_evidence',error:String(e.message)});}
}
const report={root,archiveCaptures:entries.filter(x=>/^20\d{6}-\d+\.json$/.test(x)).length,pairs,eligibleRowsClaimedByFiles:pairs.reduce((n,p)=>n+p.compared,0),independentlyAuthenticatedRows:null,warning:'File booleans alone cannot authenticate capture provenance. No independent-method hit rate is computed. Missing evidence is not a 0% hit rate.'};
console.log(JSON.stringify(report,null,2));
