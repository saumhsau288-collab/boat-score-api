// Fair paired comparison: evaluate all four baselines on exactly the same races.
// Descriptive post-hoc research only; no prospective validity claim.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const data=JSON.parse(await fs.readFile(path.join(dir,'research-baseline-ranking-comparison.json'),'utf8'));
const methods=['savedAppScore','posthocWinRate','posthocAverageST','boatNumber'];
const paired=data.rows.filter(r=>methods.every(m=>r.methods?.[m]?.eligible===true));
const counts={};
for(const method of methods){
 const n=paired.length;
 const topFinish=paired.map(r=>r.methods[method].topRankFinish);
 counts[method]={eligible:n,firstPlaceTop:topFinish.filter(p=>p===1).length,topRankMeanFinish:n?Number((topFinish.reduce((a,b)=>a+b,0)/n).toFixed(3)):null,topThreeOverlap:paired.reduce((sum,r)=>sum+r.methods[method].topThreeOverlap,0)};
}
const report={pairedRaces:paired.length,excludedFromPairedComparison:data.rows.length-paired.length,methods:counts,pairedRaceKeys:paired.map(r=>[r.date,r.venue,r.race].join(':')),preRaceAuthenticated:false,calibrationEligible:false,weightsChanged:false,warning:'Fair same-race comparison but still exploratory, small and post-hoc; boat number is not verified entry course. No tuning authorized.'};
await fs.writeFile(path.join(dir,'research-paired-baseline-ranking-comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research paired baseline ranking comparison:',JSON.stringify(report));
