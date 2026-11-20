import fs from 'node:fs/promises';
import path from 'node:path';
import {extractOfficialRacers} from './extract-research-official-racers.mjs';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const rows=[];
for(const entry of manifest.rows){
 if(!entry.file)continue;
 const parsed=extractOfficialRacers(await fs.readFile(path.join(dir,entry.file),'utf8'));
 rows.push({date:entry.date,venue:entry.venue,race:entry.race,sourceSha256:entry.sha256,sourceUrl:entry.url,...parsed});
}
const report={total:rows.length,completeSixRacerRecords:rows.filter(r=>r.completeSixRacers).length,preRaceAuthenticated:0,calibrationEligible:0,rows,warning:'Post-hoc official HTML parsing does not establish the deployed predictor used these feature values before cutoff.'};
await fs.writeFile(path.join(dir,'six-racer-extraction.json'),JSON.stringify(report,null,2)+'\n');
console.log('Six racer extraction:',JSON.stringify({total:report.total,completeSixRacerRecords:report.completeSixRacerRecords,preRaceAuthenticated:0,calibrationEligible:0}));
console.log('First extraction:',JSON.stringify(rows[0]?.racers?.slice(0,2)??[]));
