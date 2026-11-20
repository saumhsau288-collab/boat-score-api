// Compare post-hoc racer attributes in large score/finish disagreement races.
// No causal inference and no tuning of deployed scoring weights.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const severe=JSON.parse(await fs.readFile(path.join(dir,'saved-score-severe-disagreements.json'),'utf8'));
const comparison=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const key=x=>[x.date,Number(x.venue),Number(x.race)].join(':');
const index=new Map(comparison.races.map(r=>[key(r),r]));
const rows=severe.severe.map(r=>{
 const race=index.get(key(r));
 if(!race)throw Error('Missing racer comparison '+key(r));
 const pick=boat=>{const x=race.racers.find(x=>Number(x.boat)===Number(boat));if(!x)throw Error('Missing racer boat '+boat);return {boat:x.boat,name:x.name,winRateAverage:x.winRateAverage,averageST:x.averageST,motorTwoWinRate:x.motorTwoWinRate,localFallback:x.localFallback,missingST:x.missingST,officialFinish:r.officialFinishOrder.indexOf(boat)+1};};
 const savedTop=pick(r.savedTopBoat),actualWinner=pick(r.actualWinner);
 return {date:r.date,venue:r.venue,race:r.race,savedTop,actualWinner,comparison:{winRateAverageWinnerMinusSavedTop:Number((actualWinner.winRateAverage-savedTop.winRateAverage).toFixed(3)),averageSTWinnerMinusSavedTop:actualWinner.averageST===null||savedTop.averageST===null?null:Number((actualWinner.averageST-savedTop.averageST).toFixed(3)),boatNumberWinnerMinusSavedTop:actualWinner.boat-savedTop.boat},missingSTBoats:race.missingST,localFallbackBoats:race.fallbackBoats,entryCourseVerified:false,preRaceAuthenticated:false};
});
const out={races:rows.length,rows,weightsChanged:false,calibrationEligible:false,warning:'Post-hoc racer win rate, ST and motor comparisons; boat number is not a verified entry course. No causal explanation or pre-race accuracy established.'};
await fs.writeFile(path.join(dir,'severe-disagreement-racer-attributes.json'),JSON.stringify(out,null,2)+'\n');
console.log('Severe disagreement racer attribute comparison:',JSON.stringify(out).slice(0,13000));
