// Research-only diagnostic of archived deployed prediction responses.
// Do not mistake ranked scores or after-the-fact API calls for historical input vectors.
import fs from 'node:fs';
const FIELDS=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
export function auditArchivedReplayInputs(capture){
 if(!Array.isArray(capture?.records))throw Error('Expected archived capture.records[]');
 const rows=capture.records.map(r=>{
  const raw=r?.response?.scoreInputsByBoat;
  const boats=Array.isArray(raw)?raw:(raw&&typeof raw==='object'?Object.entries(raw).map(([boat,values])=>({...values,boat:Number(boat)})):[]);
  const six=boats.length===6&&new Set(boats.map(b=>Number(b?.boat))).size===6&&boats.every(b=>Number.isInteger(Number(b?.boat))&&Number(b.boat)>=1&&Number(b.boat)<=6);
  const missing=FIELDS.filter(f=>!six||!boats.every(b=>typeof b[f]==='number'&&Number.isFinite(b[f])&&b[f]>=0));
  const hasOriginalInputs=six&&missing.length===0;
  return {date:r?.date??null,venue:r?.venue??null,race:r?.race??null,
   ready:r?.response?.ready===true&&r?.httpStatus===200,
   hasSixOriginalInputs:hasOriginalInputs,missingOriginalFields:missing,
   hasOnlyOutputRankedScores:!hasOriginalInputs&&Array.isArray(r?.response?.rankedScores),
   eligibleForHistoricalReplay:false,
   reasons:[...(!hasOriginalInputs?['original_historical_features_missing']:[]),
    'historical_input_provenance_not_independently_authenticated',
    'archived_prediction_not_a_replay_of_original_historical_features']};
 });
 return {method:'archived_capture_original_replay_input_audit',
  total:rows.length,ready:rows.filter(r=>r.ready).length,
  sixOriginalInputs:rows.filter(r=>r.hasSixOriginalInputs).length,
  outputScoresWithoutInputs:rows.filter(r=>r.hasOnlyOutputRankedScores).length,
  eligibleForHistoricalReplay:0,rows,
  warning:'Saved rankedScores are prediction outputs, not historical inputs. This audit never approves scoring calibration or claims pre-race accuracy.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/audit-archived-replay-inputs.mjs <capture.json> <report.json>');
 const report=auditArchivedReplayInputs(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({total:report.total,ready:report.ready,sixOriginalInputs:report.sixOriginalInputs,outputScoresWithoutInputs:report.outputScoresWithoutInputs}));
}
