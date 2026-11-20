// Post-hoc normalization audit only. Not pre-race scoring evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import {normalizeResearchRacer} from './normalize-research-racer-features.mjs';
const dir=process.argv[2]||'research-official-racelists';
const source=JSON.parse(await fs.readFile(path.join(dir,'six-racer-extraction.json'),'utf8'));
const races=source.rows.map(r=>({date:r.date,venue:r.venue,race:r.race,completeSixRacers:r.completeSixRacers,racers:r.racers.map(normalizeResearchRacer)}));
const all=races.flatMap(r=>r.racers);
const report={raceCount:races.length,racerCount:all.length,completeSixRacerRaces:races.filter(x=>x.completeSixRacers).length,localWinRateFallbackCount:all.filter(x=>x.localWinRateFallbackApplied).length,missingAverageSTCount:all.filter(x=>x.averageSTMissing).length,races,preRaceAuthenticated:false,calibrationEligible:false,warning:'These values are extracted from post-hoc official HTML. Do not use them to fit historical prediction weights.'};
await fs.writeFile(path.join(dir,'normalized-racer-features.json'),JSON.stringify(report,null,2)+'\n');
console.log('Normalized racer feature audit:',JSON.stringify({raceCount:report.raceCount,racerCount:report.racerCount,completeSixRacerRaces:report.completeSixRacerRaces,localWinRateFallbackCount:report.localWinRateFallbackCount,missingAverageSTCount:report.missingAverageSTCount,calibrationEligible:false}));
console.log('First normalized racer:',JSON.stringify(all[0]??null));
