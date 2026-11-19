// Research-only official result targets for historical races without saved predictions.
// This creates URLs, not authenticated historical result records.
import fs from 'node:fs';
import {buildOfficialResultRequestManifest} from './build-official-result-request-manifest.mjs';
export function buildManualHistoricalResultTargets(targets,{maxTargets=24}={}){
 if(!Array.isArray(targets)||!Number.isInteger(maxTargets)||maxTargets<1||maxTargets>100)throw Error('targets[] and maxTargets 1..100 required');
 if(targets.length>maxTargets)throw Error('Too many requested historical races');
 const manifest=buildOfficialResultRequestManifest({records:targets});
 if(manifest.invalidCaptureRows.length)throw Error('Invalid date, venue or race in requested targets');
 if(manifest.duplicateKeys)throw Error('Duplicate historical race targets');
 return {method:'manual_historical_official_result_targets_unverified',targets:manifest.requests.map(r=>({
  date:r.date,venue:r.venue,race:r.race,officialResultPageUrl:r.officialResultPageUrl,
  resultVerified:false,actualEntryCourseVerified:false,historicalInputVerified:false
 })),verifiedResults:0,eligibleForHistoricalReplay:0,
 warning:'Official result URL is not evidence that race occurred, nor does it provide historical pre-race input features. Fetch and independently review before use.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/build-manual-historical-result-targets.mjs <targets.json> <output.json>');
 const result=buildManualHistoricalResultTargets(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({targets:result.targets.length,verifiedResults:0}));
}
