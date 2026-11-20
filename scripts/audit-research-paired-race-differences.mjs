// Paired per-race differences against saved app rankings; no inference or tuning.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const data=JSON.parse(await fs.readFile(path.join(dir,'research-baseline-ranking-comparison.json'),'utf8'));
const methods=['posthocWinRate','posthocAverageST','boatNumber'];
const rows=[];
for(const method of methods){
 const paired=data.rows.filter(r=>r.methods?.savedAppScore?.eligible&&r.methods?.[method]?.eligible);
 const differences=paired.map(r=>({
  race:[r.date,r.venue,r.race].join(':'),
  finishDifference:r.methods[method].topRankFinish-r.methods.savedAppScore.topRankFinish,
  topThreeOverlapDifference:r.methods[method].topThreeOverlap-r.methods.savedAppScore.topThreeOverlap
 }));
 const count=fn=>differences.filter(fn).length;
 rows.push({method,pairedRaces:paired.length,betterTopFinish:count(r=>r.finishDifference<0),equalTopFinish:count(r=>r.finishDifference===0),worseTopFinish:count(r=>r.finishDifference>0),betterTopThreeOverlap:count(r=>r.topThreeOverlapDifference>0),equalTopThreeOverlap:count(r=>r.topThreeOverlapDifference===0),worseTopThreeOverlap:count(r=>r.topThreeOverlapDifference<0),differences});
}
const out={rows,weightsChanged:false,calibrationEligible:false,preRaceAuthenticated:false,warning:'Small retrospective paired differences only; not evidence to select new production weights or estimate future prediction performance.'};
await fs.writeFile(path.join(dir,'research-paired-race-differences.json'),JSON.stringify(out,null,2)+'\n');
console.log('Research paired race differences:',JSON.stringify(rows.map(({differences,...r})=>r)));
