// Investigate proxy ranking disagreements, never infer the cause from post-hoc inputs.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const report=JSON.parse(await fs.readFile(path.join(dir,'research-candidate-formula-proxy.json'),'utf8'));
const comparisons=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const key=r=>[r.date,Number(r.venue),Number(r.race)].join(':');
const byRace=new Map(comparisons.races.map(r=>[key(r),r]));
const rows=report.rows.filter(r=>!r.proxyTopMatchesSaved).map(r=>{
 const race=byRace.get(key(r));if(!race)throw Error('race_missing:'+key(r));
 const savedTop=r.savedOrder[0],proxyTop=r.proxyOrder[0];
 const attrs=boat=>{const x=race.racers.find(y=>y.boat===boat);if(!x)throw Error('racer_missing:'+boat);return {boat,name:x.name,nationalWinRate:x.nationalWinRate,rawLocalWinRate:x.rawLocalWinRate,winRateAverage:x.winRateAverage,localFallback:x.localFallback,averageST:x.averageST,motorTwoWinRate:x.motorTwoWinRate};};
 return {date:r.date,venue:r.venue,race:r.race,savedTop:attrs(savedTop),proxyTop:attrs(proxyTop),savedOrder:r.savedOrder,proxyOrder:r.proxyOrder,localFallbackBoats:race.fallbackBoats,possibleUnverifiedDifferences:['original_pre_race_metrics','nationwide_place_rate_tiebreak','exhibition_adjustment','start_adjustment','deployed_revision'],causeEstablished:false};
});
const out={disagreementCount:rows.length,rows,causeEstablished:false,originalScoreReproduced:false,calibrationEligible:false,weightsChanged:false,warning:'Post-hoc proxy disagreement only. Differences cannot be causally assigned without original inputs and deployed version.'};
await fs.writeFile(path.join(dir,'research-candidate-formula-disagreements.json'),JSON.stringify(out,null,2)+'\n');
console.log('Research candidate formula disagreements:',JSON.stringify(out));
