// Offline comparison only. Never replay the current prediction API as if it were a historical snapshot.
import fs from 'node:fs';
import {validateHistoricalPreRaceSnapshot} from './validate-historical-prerace-snapshot.mjs';
export function compareHistoricalSavedPredictions(snapshots, results){
 if(!Array.isArray(snapshots)||!Array.isArray(results))throw Error('Expected snapshots[] and results[]');
 const resultKeys=new Map();
 for(const r of results){
  const key=[r?.date,r?.venue,r?.race].join(':');
  resultKeys.set(key,[...(resultKeys.get(key)||[]),r]);
 }
 const snapshotKeys=new Set();
 const rows=snapshots.map(s=>{
  const key=[s?.date,s?.venue,s?.race].join(':');
  const duplicate=snapshotKeys.has(key);
  snapshotKeys.add(key);
  const matches=resultKeys.get(key)||[];
  const result=matches.length===1?matches[0]:null;
  const gate=validateHistoricalPreRaceSnapshot(s,result);
  const issues=[...gate.issues];
  if(duplicate)issues.push('duplicate_snapshot_race');
  if(matches.length>1)issues.push('duplicate_result_race');
  if(matches.length===0)issues.push('missing_result');
  if(issues.length)return {date:s?.date,venue:s?.venue,race:s?.race,status:'held',issues};
  const actual=result.podium;
  if(!Array.isArray(actual)||actual.length!==3||new Set(actual).size!==3||actual.some(n=>!Number.isInteger(n)||n<1||n>6))
   return {date:s.date,venue:s.venue,race:s.race,status:'held',issues:['invalid_verified_podium']};
  const hit=picks=>picks.some(p=>p.every((n,i)=>n===actual[i]));
  return {date:s.date,venue:s.venue,race:s.race,status:'compared',mainHit:hit(s.main),upsetHit:hit(s.upset)};
 });
 const compared=rows.filter(r=>r.status==='compared');
 const mainHits=compared.filter(r=>r.mainHit).length,upsetHits=compared.filter(r=>r.upsetHit).length;
 return {method:'saved_prerace_predictions_vs_independently_verified_results',checked:snapshots.length,compared:compared.length,held:rows.length-compared.length,mainHits,upsetHits,mainHitRate:compared.length?mainHits/compared.length:null,upsetHitRate:compared.length?upsetHits/compared.length:null,eligibleForWeightTuning:false,warning:'Descriptive comparison only; sample adequacy and independent verification must be reviewed before tuning.',rows};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [snapshotsPath,resultsPath]=process.argv.slice(2);
 if(!snapshotsPath||!resultsPath)throw Error('Usage: node scripts/compare-historical-saved-predictions.mjs SNAPSHOTS_JSON RESULTS_JSON');
 const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
 console.log(JSON.stringify(compareHistoricalSavedPredictions(read(snapshotsPath),read(resultsPath))));
}
