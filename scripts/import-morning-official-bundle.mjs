// Research-only import of a previously collected official entry + last-50 bundle.
// Never fetches live sources or upgrades caller-supplied provenance to verified.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareMorningEvidenceFromOfficialEntry} from './prepare-morning-evidence-from-official-entry.mjs';
import {appendMorningEvidenceDraft} from './store-morning-evidence-drafts.mjs';
export function importMorningOfficialBundle(bundle,outputFile){
 if(!bundle||typeof bundle!=='object')return {imported:false,reason:'missing_bundle'};
 const prepared=prepareMorningEvidenceFromOfficialEntry(bundle.entry,bundle.last50ByBoat);
 if(!prepared.ready)return {imported:false,reason:prepared.reason,missing:prepared.missing??[]};
 const result=appendMorningEvidenceDraft(outputFile,prepared.sealed);
 return {imported:true,count:result.count,sha256:prepared.sealed.sha256,
  verifiedOfficialSources:false,eligibleForVerifiedAccuracy:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/import-morning-official-bundle.mjs bundle.json output.ndjson');
 const result=importMorningOfficialBundle(JSON.parse(fs.readFileSync(input,'utf8')),output);
 console.log(JSON.stringify(result,null,2));
 if(!result.imported)process.exitCode=2;
}
