// Research-only comparison: saved app scores versus verified official finish order.
// No pre-race authentication, so this is a retrospective descriptive check only.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const scores=JSON.parse(await fs.readFile(path.join(dir,'saved-score-vs-posthoc-racer-comparison.json'),'utf8'));
const finishes=JSON.parse(await fs.readFile(path.join(dir,'official-verified-finishing-orders.json'),'utf8'));
const key=r=>[String(r.date),Number(r.venue),Number(r.race)].join(':');
const index=new Map(finishes.rows.map(r=>[key(r),r]));
const rows=scores.rows.map(r=>{
 const finish=index.get(key(r));
 if(!finish?.finishVerified)return {date:r.date,venue:r.venue,race:r.race,verifiedFinish:false,reason:finish?.reason??'missing_result',preRaceAuthenticated:false,calibrationEligible:false};
 const top=r.bySavedScore[0],position=finish.finishingBoats.indexOf(top)+1;
 const top3=r.bySavedScore.slice(0,3);
 const actualTop3=finish.finishingBoats.slice(0,3);
 return {date:r.date,venue:r.venue,race:r.race,verifiedFinish:true,savedScoreOrder:r.bySavedScore,officialFinishOrder:finish.finishingBoats,savedTopBoat:top,savedTopFinishPosition:position,savedTopWon:position===1,savedTopPlacedTop3:position<=3,savedTop3InActualTop3:top3.filter(x=>actualTop3.includes(x)).length,officialResultSource:finish.sourceUrl,preRaceAuthenticated:false,calibrationEligible:false};
});
const verified=rows.filter(r=>r.verifiedFinish);
const report={total:rows.length,verifiedFinishes:verified.length,unverifiedFinishes:rows.length-verified.length,savedTopWonCount:verified.filter(r=>r.savedTopWon).length,savedTopTop3Count:verified.filter(r=>r.savedTopPlacedTop3).length,top3OverlapTotal:verified.reduce((sum,r)=>sum+r.savedTop3InActualTop3,0),rows,preRaceAuthenticated:false,predictionAccuracyCertified:false,calibrationEligible:false,warning:'Retrospective comparison only. The saved scores were not independently authenticated as generated before each race. Do not present counts as prospective prediction accuracy or tune production weights.'};
await fs.writeFile(path.join(dir,'saved-scores-vs-official-finishes.json'),JSON.stringify(report,null,2)+'\n');
console.log('Saved scores vs official finishes (retrospective only):',JSON.stringify({total:report.total,verifiedFinishes:report.verifiedFinishes,unverifiedFinishes:report.unverifiedFinishes,savedTopWonCount:report.savedTopWonCount,savedTopTop3Count:report.savedTopTop3Count,top3OverlapTotal:report.top3OverlapTotal,predictionAccuracyCertified:false,calibrationEligible:false}));
console.log('Unverified official results:',JSON.stringify(rows.filter(x=>!x.verifiedFinish)));
