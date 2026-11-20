// Inspect only the structure of saved app score outputs, not inferred original inputs.
import fs from 'node:fs/promises';
import path from 'node:path';
const file=process.argv[2],dir=process.argv[3]||'research-official-racelists';
if(!file)throw Error('capture_file_required');
const capture=JSON.parse(await fs.readFile(file,'utf8'));
const ready=(capture.records||[]).filter(r=>r.response?.ready===true);
const rows=ready.map(r=>{
 const ranked=r.response?.rankedScores;
 const entries=Array.isArray(ranked)?ranked:[];
 const itemTypes=[...new Set(entries.map(x=>x===null?'null':Array.isArray(x)?'array':typeof x))];
 const keys=[...new Set(entries.flatMap(x=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x):[]))].sort();
 return {date:r.date,venue:r.venue,race:r.race,rankedScoresCount:entries.length,itemTypes,entryKeys:keys,hasOriginalSixRacerInputs:Array.isArray(r.response?.scoreInputsByBoat)&&r.response.scoreInputsByBoat.length===6,scoreValuesValidated:false,preRaceAuthenticated:false};
});
const report={readyRecords:rows.length,rows,originalInputsAuthenticated:0,calibrationEligible:0,warning:'Structural metadata only. Ranked scores are outputs, not source feature vectors.'};
await fs.writeFile(path.join(dir,'saved-score-output-schema.json'),JSON.stringify(report,null,2)+'\n');
console.log('Saved score output schema:',JSON.stringify({readyRecords:rows.length,shapes:[...new Set(rows.map(x=>JSON.stringify({count:x.rankedScoresCount,types:x.itemTypes,keys:x.entryKeys})))].map(JSON.parse),originalInputsAuthenticated:0,calibrationEligible:0}));
