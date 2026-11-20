// Quantify candidate raw-local-zero proxy agreement with saved score ordering.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const sensitivity=JSON.parse(await fs.readFile(path.join(dir,'research-local-zero-sensitivity.json'),'utf8'));
const saved=JSON.parse(await fs.readFile(path.join(dir,'saved-score-vs-posthoc-racer-comparison.json'),'utf8'));
const key=r=>[r.date,Number(r.venue),Number(r.race)].join(':');
const lookup=new Map(saved.rows.map(r=>[key(r),r]));
const rows=[];
for(const r of sensitivity.changed){
 const s=lookup.get(key(r));if(!s)throw Error('saved_missing:'+key(r));
 rows.push({date:r.date,venue:r.venue,race:r.race,zeroLocalBoats:r.zeroLocalBoats,rawTop:r.rawTop,fallbackTop:r.fallbackTop,savedTop:s.bySavedScore[0],rawTopMatchesSaved:r.rawTop===s.bySavedScore[0],fallbackTopMatchesSaved:r.fallbackTop===s.bySavedScore[0],rawExactMatchesSaved:r.rawOrder.every((x,i)=>x===s.bySavedScore[i]),fallbackExactMatchesSaved:r.fallbackOrder.every((x,i)=>x===s.bySavedScore[i]),causeVerified:false});
}
const report={affectedRaceCount:rows.length,rawTopMatchesSavedInAffected:rows.filter(r=>r.rawTopMatchesSaved).length,fallbackTopMatchesSavedInAffected:rows.filter(r=>r.fallbackTopMatchesSaved).length,rawExactMatchesSavedInAffected:rows.filter(r=>r.rawExactMatchesSaved).length,fallbackExactMatchesSavedInAffected:rows.filter(r=>r.fallbackExactMatchesSaved).length,rows,preRaceAuthenticated:false,originalScoreReproduced:false,calibrationEligible:false,weightsChanged:false,warning:'Agreement with saved outputs does not authenticate historical inputs or show which fallback is predictively better.'};
await fs.writeFile(path.join(dir,'research-local-zero-saved-agreement.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research local zero saved agreement:',JSON.stringify(report));
