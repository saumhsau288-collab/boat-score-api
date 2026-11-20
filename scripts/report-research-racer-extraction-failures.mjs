// Research-only summarize failures in six-racer extraction, without guessing missing fields.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const report=JSON.parse(await fs.readFile(path.join(dir,'six-racer-extraction.json'),'utf8'));
const failures=report.rows.filter(r=>!r.completeSixRacers).map(r=>({date:r.date,venue:r.venue,race:r.race,extractedBoats:r.racers.map(x=>x.boat),errors:r.errors,sourceUrl:r.sourceUrl}));
const summary={total:report.total,complete:report.completeSixRacerRecords,incomplete:failures.length,failures,calibrationEligible:0};
await fs.writeFile(path.join(dir,'six-racer-failures.json'),JSON.stringify(summary,null,2)+'\n');
console.log('Six racer failures:',JSON.stringify(failures));
