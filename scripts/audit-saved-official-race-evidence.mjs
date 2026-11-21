#!/usr/bin/env node
// Offline-only audit of a previously saved official HTML + metadata pair.
// Does not fetch, modify source evidence, deploy or calibrate predictions.
import {readFile,writeFile} from 'node:fs/promises';
import {auditOfficialRaceHtmlCapture} from './audit-official-race-html-capture.mjs';
export async function auditSavedOfficialRaceEvidence({htmlPath,metadataPath,outputPath}){
 if(!htmlPath||!metadataPath||!outputPath)throw Error('paths_required');
 const [body,metadataText]=await Promise.all([readFile(htmlPath),readFile(metadataPath,'utf8')]);
 const metadata=JSON.parse(metadataText);
 const result=auditOfficialRaceHtmlCapture({html:body.toString('utf8'),metadata});
 const report={...result,sourceHtmlPath:htmlPath,sourceMetadataPath:metadataPath,sourceSha256:metadata.sha256??null,
  eligibleForCalibration:false};
 await writeFile(outputPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [htmlPath,metadataPath,outputPath]=process.argv.slice(2);
 const report=await auditSavedOfficialRaceEvidence({htmlPath,metadataPath,outputPath});
 console.log(JSON.stringify({status:report.status,identity:report.identity?.status??null,cutoff:report.cutoff?.status??null,eligibleForCalibration:false}));
}
