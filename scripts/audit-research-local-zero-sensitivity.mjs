// Compare local 0.00 treatment in the candidate 70/30 rank formula (post-hoc only).
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const comparisons=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const saved=JSON.parse(await fs.readFile(path.join(dir,'saved-score-vs-posthoc-racer-comparison.json'),'utf8'));
const key=r=>[r.date,Number(r.venue),Number(r.race)].join(':');
const lookup=new Map(saved.rows.map(r=>[key(r),r]));
function ordering(racers,mode){
 const rank=fn=>new Map([...racers].sort((a,b)=>fn(b)-fn(a)||a.boat-b.boat).map((r,i)=>[r.boat,6-i]));
 const win=rank(r=>(r.nationalWinRate+(mode==='raw'?r.rawLocalWinRate:r.effectiveLocalWinRate))/2);
 const motor=rank(r=>r.motorTwoWinRate);
 return racers.map(r=>({boat:r.boat,score:7*win.get(r.boat)+3*motor.get(r.boat)})).sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
}
const rows=[];
for(const r of comparisons.races){
 const s=lookup.get(key(r));if(!s)continue;
 const raw=ordering(r.racers,'raw'),fallback=ordering(r.racers,'fallback');
 rows.push({date:r.date,venue:r.venue,race:r.race,zeroLocalBoats:r.fallbackBoats,rawTop:raw[0],fallbackTop:fallback[0],rawOrder:raw,fallbackOrder:fallback,topChanged:raw[0]!==fallback[0],orderChanged:raw.some((b,i)=>b!==fallback[i]),rawTopMatchesSaved:raw[0]===s.bySavedScore[0],fallbackTopMatchesSaved:fallback[0]===s.bySavedScore[0],originalScoreReproduced:false});
}
const changed=rows.filter(r=>r.orderChanged);
const report={raceCount:rows.length,localZeroRaces:rows.filter(r=>r.zeroLocalBoats.length).length,orderChangedRaces:changed.length,topChangedRaces:rows.filter(r=>r.topChanged).length,rawTopMatchesSaved:rows.filter(r=>r.rawTopMatchesSaved).length,fallbackTopMatchesSaved:rows.filter(r=>r.fallbackTopMatchesSaved).length,changed,preRaceAuthenticated:false,originalScoreReproduced:0,calibrationEligible:false,weightsChanged:false,warning:'Post-hoc sensitivity to local-zero handling only; not a reconstruction of deployed pre-race scores.'};
await fs.writeFile(path.join(dir,'research-local-zero-sensitivity.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research local zero sensitivity:',JSON.stringify(report));
