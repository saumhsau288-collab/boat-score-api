// Read-only audit of historical backtest reports. Never fabricate pre-race features.
import fs from 'node:fs';
import {evaluateSnapshot,BASE_WEIGHTS} from '../boat-score-2-calibration.js';
const paths=process.argv.slice(2);
if(!paths.length){console.error('Usage: node scripts/audit-calibration-inputs.mjs backtest-results/*.json');process.exit(2)}
const totals={files:0,records:0,compared:0,held:0,usablePreRaceSnapshots:0,missingInputs:{},reasons:{}};
for(const path of paths){
 const report=JSON.parse(fs.readFileSync(path,'utf8'));
 if(!Array.isArray(report.records))throw Error('Missing records in '+path);
 totals.files++;
 for(const r of report.records){
  totals.records++;
  if(r.status==='compared')totals.compared++;else totals.held++;
  for(const key of r.missingInputs||[])totals.missingInputs[key]=(totals.missingInputs[key]||0)+1;
  // Current backtest records store ticket combinations and finish order as a string.
  // They do NOT contain authenticated pre-race six-racer metric snapshots.
  const snapshot={...r,preRaceSnapshot:r.preRaceSnapshot===true,resultVerified:r.resultVerified===true};
  if(evaluateSnapshot(snapshot,BASE_WEIGHTS))totals.usablePreRaceSnapshots++;
  else totals.reasons.noVerifiedPreRaceSixRacerSnapshot=(totals.reasons.noVerifiedPreRaceSixRacerSnapshot||0)+1;
 }
}
const report={...totals,calibrationReady:totals.usablePreRaceSnapshots>=45,
 warning:'Retrospective prediction comparisons cannot establish historical feature snapshots. No score weight optimization was performed.'};
console.log(JSON.stringify(report,null,2));
