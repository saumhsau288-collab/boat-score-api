// Audit metadata explicitly returned by deployed app, without inferring missing flags.
import fs from 'node:fs/promises';
import path from 'node:path';
const file=process.argv[2],dir=process.argv[3]||'research-official-racelists';
if(!file)throw Error('capture_file_required');
const capture=JSON.parse(await fs.readFile(file,'utf8'));
const fields=['method','predictionMode','startAdjustmentApplied','exhibitionAdjustmentApplied','startCoursesVerified','missingInputs','sourceBranch','sourceCommit','version','startVerification','exhibitionVerification','officialStatsRetry','placeRateTieBreakVerified'];
const rows=(capture.records||[]).filter(r=>r.response?.ready===true).map(r=>{
 const response=r.response;
 const metadata=Object.fromEntries(fields.map(k=>[k,Object.hasOwn(response,k)?response[k]:null]));
 const presentFields=fields.filter(k=>Object.hasOwn(response,k));
 return {date:r.date,venue:r.venue,race:r.race,presentFields,metadata,hasOriginalSixRacerInputs:Array.isArray(response.scoreInputsByBoat)&&response.scoreInputsByBoat.length===6,preRaceAuthenticated:false};
});
const counts=Object.fromEntries(fields.map(k=>[k,rows.filter(r=>r.presentFields.includes(k)).length]));
const flagCounts=Object.fromEntries(['startAdjustmentApplied','exhibitionAdjustmentApplied','startCoursesVerified'].map(k=>[k,{true:rows.filter(r=>r.metadata[k]===true).length,false:rows.filter(r=>r.metadata[k]===false).length,unknown:rows.filter(r=>typeof r.metadata[k]!=='boolean').length}]));
const reasonCounts=Object.fromEntries(['startVerification','exhibitionVerification'].map(k=>[k,Object.fromEntries([...new Set(rows.map(r=>r.metadata[k]).filter(v=>typeof v==='string'))].map(v=>[v,rows.filter(r=>r.metadata[k]===v).length]))]));
const methods=[...new Set(rows.map(r=>r.metadata.method).filter(x=>typeof x==='string'))];
const modes=[...new Set(rows.map(r=>r.metadata.predictionMode).filter(x=>typeof x==='string'))];
const report={readyRecords:rows.length,fieldPresenceCounts:counts,flagCounts,reasonCounts,methods,modes,rows,deployedRevisionAuthenticated:false,originalInputsAuthenticated:false,calibrationEligible:false,warning:'Only top-level fields explicitly present in archived responses are reported. Missing flags are unknown, not false; no deployed revision or input provenance is authenticated.'};
await fs.writeFile(path.join(dir,'research-saved-response-provenance.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research saved response provenance:',JSON.stringify({readyRecords:report.readyRecords,fieldPresenceCounts:counts,flagCounts,reasonCounts,methods,modes,deployedRevisionAuthenticated:false,calibrationEligible:false}));
