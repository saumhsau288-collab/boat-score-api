// Research-only per-race comparison table, not a prediction or a backtest.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const data=JSON.parse(await fs.readFile(path.join(dir,'normalized-racer-features.json'),'utf8'));
const races=data.races.map(r=>{
 const racers=r.racers.map(x=>({boat:x.boat,racerId:x.racerId,name:x.name,nationalWinRate:x.nationalWinRate,rawLocalWinRate:x.rawLocalWinRate,effectiveLocalWinRate:x.effectiveLocalWinRate,winRateAverage:x.winRateAverage,averageST:x.averageST,motorTwoWinRate:x.motorTwoWinRate,localFallback:x.localWinRateFallbackApplied,missingST:x.averageSTMissing}));
 const byWinRate=[...racers].sort((a,b)=>b.winRateAverage-a.winRateAverage||a.boat-b.boat).map(x=>x.boat);
 const byST=[...racers].filter(x=>x.averageST!==null).sort((a,b)=>a.averageST-b.averageST||a.boat-b.boat).map(x=>x.boat);
 return {date:r.date,venue:r.venue,race:r.race,racers,byWinRate,byST,missingST:racers.filter(x=>x.missingST).map(x=>x.boat),fallbackBoats:racers.filter(x=>x.localFallback).map(x=>x.boat)};
});
const report={raceCount:races.length,races,weightsChanged:false,predictionsGenerated:false,preRaceAuthenticated:false,calibrationEligible:false,warning:'Descriptive comparisons of post-hoc race-list data only. Not app predictions or evidence for weight tuning.'};
await fs.writeFile(path.join(dir,'racer-comparison-tables.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research racer comparison:',JSON.stringify({raceCount:races.length,missingSTRaces:races.filter(x=>x.missingST.length).length,fallbackRaces:races.filter(x=>x.fallbackBoats.length).length,predictionsGenerated:false,calibrationEligible:false}));
console.log('First race comparison:',JSON.stringify(races[0]&&{venue:races[0].venue,race:races[0].race,byWinRate:races[0].byWinRate,byST:races[0].byST,missingST:races[0].missingST,fallbackBoats:races[0].fallbackBoats}));
