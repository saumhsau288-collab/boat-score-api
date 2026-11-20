// Research-only candidate formula proxy. Post-hoc data cannot reproduce saved pre-race scores.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const comparisons=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const saved=JSON.parse(await fs.readFile(path.join(dir,'saved-score-vs-posthoc-racer-comparison.json'),'utf8'));
const key=r=>[r.date,Number(r.venue),Number(r.race)].join(':');
const bySaved=new Map(saved.rows.map(r=>[key(r),r]));
const rows=[];
for(const race of comparisons.races){
 const s=bySaved.get(key(race));if(!s)continue;
 const racers=race.racers;
 if(racers.length!==6||new Set(racers.map(r=>r.boat)).size!==6)throw Error('six_boats_required');
 const rank=(get)=>new Map([...racers].sort((a,b)=>get(b)-get(a)||a.boat-b.boat).map((r,i)=>[r.boat,6-i]));
 const wins=rank(r=>r.winRateAverage),motors=rank(r=>r.motorTwoWinRate);
 const proxy=racers.map(r=>({boat:r.boat,proxyBaseScore:7*wins.get(r.boat)+3*motors.get(r.boat)})).sort((a,b)=>b.proxyBaseScore-a.proxyBaseScore||a.boat-b.boat);
 const proxyOrder=proxy.map(r=>r.boat);
 const savedOrder=s.bySavedScore;
 const hasLocalFallback=race.fallbackBoats.length>0;
 rows.push({date:race.date,venue:race.venue,race:race.race,proxyOrder,savedOrder,proxyTopMatchesSaved:proxyOrder[0]===savedOrder[0],proxyOrderExactlyMatchesSaved:proxyOrder.every((b,i)=>b===savedOrder[i]),proxyScores:proxy,missingInputs:['original_six_racer_pre_race_inputs','nationwide_top2_rate','nationwide_top3_rate','verified_adjustment_inputs','deployed_revision_sha'],postHocLocalZeroFallbackDifferentFromCandidate:hasLocalFallback,originalScoreReproduced:false,calibrationEligible:false});
}
const report={raceCount:rows.length,proxyTopMatchesSaved:rows.filter(r=>r.proxyTopMatchesSaved).length,proxyOrderExactlyMatchesSaved:rows.filter(r=>r.proxyOrderExactlyMatchesSaved).length,rows,originalScoreReproduced:0,preRaceAuthenticated:false,calibrationEligible:false,weightsChanged:false,warning:'Proxy uses post-hoc normalized racer data and omits place-rate tie breaks and verified start/exhibition adjustments. Do NOT interpret matching ranks as exact score reproduction.'};
await fs.writeFile(path.join(dir,'research-candidate-formula-proxy.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research candidate formula proxy:',JSON.stringify({raceCount:report.raceCount,proxyTopMatchesSaved:report.proxyTopMatchesSaved,proxyOrderExactlyMatchesSaved:report.proxyOrderExactlyMatchesSaved,originalScoreReproduced:0,calibrationEligible:false}));
