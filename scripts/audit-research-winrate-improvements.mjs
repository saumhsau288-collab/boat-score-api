// Identify exact races where post-hoc win-rate ordering improves on saved score ordering.
// Diagnostic only; does not modify score weights or claim pre-race predictive accuracy.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const baseline=JSON.parse(await fs.readFile(path.join(dir,'research-baseline-ranking-comparison.json'),'utf8'));
const saved=JSON.parse(await fs.readFile(path.join(dir,'saved-scores-vs-official-finishes.json'),'utf8'));
const features=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const key=r=>[r.date,Number(r.venue),Number(r.race)].join(':');
const bySaved=new Map(saved.rows.filter(r=>r.verifiedFinish).map(r=>[key(r),r]));
const byFeature=new Map(features.races.map(r=>[key(r),r]));
const rows=[];
for(const r of baseline.rows){
 const app=r.methods?.savedAppScore,win=r.methods?.posthocWinRate;
 if(!app?.eligible||!win?.eligible||win.topRankFinish>=app.topRankFinish)continue;
 const s=bySaved.get(key(r)),f=byFeature.get(key(r));
 if(!s||!f)throw Error('Missing joined data '+key(r));
 const appBoat=s.savedScoreOrder[0],winBoat=f.byWinRate[0];
 const racer=boat=>{const x=f.racers.find(x=>Number(x.boat)===Number(boat));if(!x)throw Error('Missing boat '+boat);return {boat,name:x.name,winRateAverage:x.winRateAverage,averageST:x.averageST,motorTwoWinRate:x.motorTwoWinRate,finish:s.officialFinishOrder.indexOf(boat)+1};};
 rows.push({date:r.date,venue:r.venue,race:r.race,appTop:racer(appBoat),winRateTop:racer(winBoat),officialFinishOrder:s.officialFinishOrder,actualWinner:s.officialFinishOrder[0],entryCourseVerified:false});
}
const report={improvedRaceCount:rows.length,rows,weightsChanged:false,preRaceAuthenticated:false,calibrationEligible:false,warning:'Selected exploratory post-hoc cases. Win-rate ordering here is not a prospective model or evidence for weight tuning.'};
await fs.writeFile(path.join(dir,'win-rate-baseline-improvement-cases.json'),JSON.stringify(report,null,2)+'\n');
console.log('Win-rate baseline improvement cases:',JSON.stringify(report));
