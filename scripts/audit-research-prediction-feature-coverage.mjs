// Research-only coverage audit: separate observed official fields from missing prediction inputs.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const data=JSON.parse(await fs.readFile(path.join(dir,'normalized-racer-features.json'),'utf8'));
const records=data.races.map(r=>{
 const fields={racerIdentity:r.racers.filter(x=>Boolean(x.racerId)&&Boolean(x.name)).length,nationalWinRate:r.racers.filter(x=>Number.isFinite(x.nationalWinRate)).length,localWinRate:r.racers.filter(x=>Number.isFinite(x.rawLocalWinRate)).length,motorTwoWinRate:r.racers.filter(x=>Number.isFinite(x.motorTwoWinRate)).length,averageST:r.racers.filter(x=>Number.isFinite(x.averageST)).length,recent50:0,exhibition:0,entry:0,weather:0};
 return {date:r.date,venue:r.venue,race:r.race,fields,hasAllCoreFields:Object.values(fields).slice(0,5).every(x=>x===6),hasAllRequiredPredictionFields:false,preRaceAuthenticated:false,calibrationEligible:false};
});
const summary={raceCount:records.length,coreCompleteRaces:records.filter(x=>x.hasAllCoreFields).length,missingSTEntries:records.reduce((n,x)=>n+6-x.fields.averageST,0),withAllRequiredPredictionFields:0,preRaceAuthenticated:0,calibrationEligible:0,records,warning:'A missing field in this report means not captured by this research extractor; it does not prove the official site or live app lacks the field. Post-hoc pages cannot authenticate original pre-race inputs.'};
await fs.writeFile(path.join(dir,'prediction-feature-coverage.json'),JSON.stringify(summary,null,2)+'\n');
console.log('Prediction feature coverage:',JSON.stringify({raceCount:summary.raceCount,coreCompleteRaces:summary.coreCompleteRaces,missingSTEntries:summary.missingSTEntries,withAllRequiredPredictionFields:0,calibrationEligible:0}));
