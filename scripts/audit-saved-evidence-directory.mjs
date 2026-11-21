#!/usr/bin/env node
// Audit a local directory of saved capture pairs. Never fetch or alter evidence.
import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {auditSavedOfficialRaceEvidence} from './audit-saved-official-race-evidence.mjs';
export async function auditSavedEvidenceDirectory({sourceDir,outputDir}){
 if(!sourceDir||!outputDir)throw Error('source_and_output_required');
 const source=resolve(sourceDir),destination=resolve(outputDir);
 if(source===destination||destination.startsWith(source+'/')||source.startsWith(destination+'/'))
  throw Error('source_output_must_be_separate');
 const entries=(await readdir(source)).filter(n=>/^\d{8}-\d{1,2}-(?:\d{1,2}|index)-[a-f0-9]{12}\.json$/.test(n)).sort();
 await mkdir(destination,{recursive:true});
 const summary={scanned:entries.length,needsIndependentVerification:0,rejected:0,errors:0,eligibleForCalibration:0,results:[]};
 for(const name of entries){
  const stem=name.slice(0,-5);
  try{
   const result=await auditSavedOfficialRaceEvidence({htmlPath:join(source,stem+'.html'),
    metadataPath:join(source,name),outputPath:join(destination,stem+'.audit.json')});
   if(result.status==='needs_independent_verification')summary.needsIndependentVerification++;
   else summary.rejected++;
   summary.results.push({file:name,status:result.status});
  }catch(error){
   summary.errors++;
   summary.results.push({file:name,status:'audit_error',reason:error?.code??error?.message??'unknown'});
  }
 }
 await writeFile(join(destination,'summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return summary;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [sourceDir,outputDir]=process.argv.slice(2);
 const summary=await auditSavedEvidenceDirectory({sourceDir,outputDir});
 console.log(JSON.stringify(summary));
}
