// Describe racer-score ranking versus official finish positions; no pre-race accuracy claim.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const comparison=JSON.parse(await fs.readFile(path.join(dir,'saved-scores-vs-official-finishes.json'),'utf8'));
const eligible=comparison.rows.filter(r=>r.verifiedFinish);
const counts=Array.from({length:6},(_,i)=>({savedScoreRank:i+1,finishPositionCounts:[0,0,0,0,0,0],meanFinishPosition:null,top3Finishes:0}));
for(const r of eligible){
 if(r.savedScoreOrder.length!==6||r.officialFinishOrder.length!==6||new Set(r.savedScoreOrder).size!==6||new Set(r.officialFinishOrder).size!==6)throw Error('Invalid six-boat ranking '+r.date+':'+r.venue+':'+r.race);
 r.savedScoreOrder.forEach((boat,rank)=>{
  const pos=r.officialFinishOrder.indexOf(boat);
  if(pos<0)throw Error('Missing official boat '+boat);
  counts[rank].finishPositionCounts[pos]++;
 });
}
for(const c of counts){
 const n=c.finishPositionCounts.reduce((a,b)=>a+b,0);
 c.meanFinishPosition=n?Number((c.finishPositionCounts.reduce((a,b,i)=>a+b*(i+1),0)/n).toFixed(3)):null;
 c.top3Finishes=c.finishPositionCounts.slice(0,3).reduce((a,b)=>a+b,0);
}
const report={races:eligible.length,scoreRankFinishMatrix:counts,excludedUnverified:comparison.rows.length-eligible.length,preRaceAuthenticated:false,predictionAccuracyCertified:false,calibrationEligible:false,warning:'Descriptive retrospective score-rank vs finishing position matrix only. Does not establish pre-race predictive validity.'};
await fs.writeFile(path.join(dir,'saved-score-rank-finish-matrix.json'),JSON.stringify(report,null,2)+'\n');
console.log('Saved score rank vs finish position matrix:',JSON.stringify(report));
