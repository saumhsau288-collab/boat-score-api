// Compare all verified races, not just severe disagreement cases.
// Boat numbers are not authenticated entry courses. No weight tuning.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const saved=JSON.parse(await fs.readFile(path.join(dir,'saved-scores-vs-official-finishes.json'),'utf8'));
const racers=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const key=r=>[r.date,Number(r.venue),Number(r.race)].join(':');
const byKey=new Map(racers.races.map(r=>[key(r),r]));
const rows=saved.rows.filter(r=>r.verifiedFinish).map(r=>{
 const data=byKey.get(key(r));if(!data)throw Error('Missing racer data '+key(r));
 const topBoat=r.savedScoreOrder[0],winnerBoat=r.officialFinishOrder[0];
 const top=data.racers.find(x=>Number(x.boat)===Number(topBoat)),winner=data.racers.find(x=>Number(x.boat)===Number(winnerBoat));
 if(!top||!winner)throw Error('Missing boat in '+key(r));
 return {date:r.date,venue:r.venue,race:r.race,savedTopBoat:topBoat,winnerBoat,sameBoat:topBoat===winnerBoat,winnerLowerNumberedBoat:winnerBoat<topBoat,winnerHigherNumberedBoat:winnerBoat>topBoat,winRateDifference:Number((winner.winRateAverage-top.winRateAverage).toFixed(3)),averageSTDifference:top.averageST===null||winner.averageST===null?null:Number((winner.averageST-top.averageST).toFixed(3)),motorTwoWinRateDifference:Number((winner.motorTwoWinRate-top.motorTwoWinRate).toFixed(3)),entryCourseVerified:false};
});
const different=rows.filter(x=>!x.sameBoat);
const count=(items,fn)=>items.filter(fn).length;
const report={verifiedRaces:rows.length,sameTopAndWinner:count(rows,x=>x.sameBoat),differentTopAndWinner:different.length,amongDifferent:{winnerLowerNumberedBoat:count(different,x=>x.winnerLowerNumberedBoat),winnerHigherNumberedBoat:count(different,x=>x.winnerHigherNumberedBoat),winnerLowerWinRate:count(different,x=>x.winRateDifference<0),winnerHigherWinRate:count(different,x=>x.winRateDifference>0),winnerSlowerAverageST:count(different,x=>x.averageSTDifference!==null&&x.averageSTDifference>0),winnerFasterAverageST:count(different,x=>x.averageSTDifference!==null&&x.averageSTDifference<0),winnerLowerMotorTwoWinRate:count(different,x=>x.motorTwoWinRateDifference<0),winnerHigherMotorTwoWinRate:count(different,x=>x.motorTwoWinRateDifference>0)},rows,weightsChanged:false,calibrationEligible:false,warning:'All verified races, avoiding severe-case-only selection. Still post-hoc, small sample, no verified entry course or pre-race input snapshot.'};
await fs.writeFile(path.join(dir,'all-verified-racer-disagreement-summary.json'),JSON.stringify(report,null,2)+'\n');
console.log('All verified racer disagreement summary:',JSON.stringify({...report,rows:undefined}));
