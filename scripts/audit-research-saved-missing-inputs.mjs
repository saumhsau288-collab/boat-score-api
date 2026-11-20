// Report only explicit missing-input labels from archived ready predictor responses.
import fs from 'node:fs/promises';
import path from 'node:path';
const file=process.argv[2],dir=process.argv[3]||'research-official-racelists';
if(!file)throw Error('capture_file_required');
const capture=JSON.parse(await fs.readFile(file,'utf8'));
const rows=(capture.records||[]).filter(r=>r.response?.ready===true).map(r=>{
 const p=r.response;
 const raw=p.missingInputs;
 const labels=Array.isArray(raw)?raw.filter(x=>typeof x==='string'):[];
 return {date:r.date,venue:r.venue,race:r.race,missingInputsPresent:Object.hasOwn(p,'missingInputs'),missingInputsArray:Array.isArray(raw),labels,mode:p.predictionMode??null,startAdjustmentApplied:p.startAdjustmentApplied??null,exhibitionAdjustmentApplied:p.exhibitionAdjustmentApplied??null};
});
const allLabels=[...new Set(rows.flatMap(r=>r.labels))].sort();
const labelCounts=Object.fromEntries(allLabels.map(k=>[k,rows.filter(r=>r.labels.includes(k)).length]));
const report={readyRecords:rows.length,missingInputsFieldPresent:rows.filter(r=>r.missingInputsPresent).length,missingInputsArrayCount:rows.filter(r=>r.missingInputsArray).length,labelCounts,rows,rootCauseEstablished:false,calibrationEligible:false,warning:'Missing-input labels are emitted by the deployed predictor and are not independently authenticated upstream outage causes. Missing label does not prove the input was verified.'};
await fs.writeFile(path.join(dir,'research-saved-missing-inputs.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research saved missing input labels:',JSON.stringify({readyRecords:report.readyRecords,missingInputsArrayCount:report.missingInputsArrayCount,labelCounts,rootCauseEstablished:false,calibrationEligible:false}));
