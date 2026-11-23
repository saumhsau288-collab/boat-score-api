// Research-only offline importer. Input must be an existing six-racer evidence snapshot.
// No live collection, fabricated values, cloud writes, or verified accuracy claims.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {sealMorningEvidenceDraft} from './seal-morning-evidence-draft.mjs';
import {appendMorningEvidenceDraft} from './store-morning-evidence-drafts.mjs';
export function importMorningEvidenceSnapshot(snapshot,outputFile){
 const sealed=sealMorningEvidenceDraft(snapshot);
 if(!sealed.envelope)return {imported:false,reason:sealed.reason,missing:sealed.missing??[]};
 const stored=appendMorningEvidenceDraft(outputFile,sealed);
 return {imported:true,count:stored.count,sha256:sealed.sha256,
  verifiedOfficialSources:false,eligibleForVerifiedAccuracy:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/import-morning-evidence-snapshot.mjs input.json output.ndjson');
 const snapshot=JSON.parse(fs.readFileSync(input,'utf8'));
 const result=importMorningEvidenceSnapshot(snapshot,output);
 console.log(JSON.stringify(result,null,2));
 if(!result.imported)process.exitCode=2;
}
