// Research-only: compare saved score order with post-hoc descriptive win-rate/ST order.
// Never label as accuracy, historical validation, or evidence for weight tuning.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists',file=process.argv[3];
if(!file)throw Error('capture_file_required');
const capture=JSON.parse(await fs.readFile(file,'utf8'));
const comparisons=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const key=r=>[String(r.date),Number(r.venue),Number(r.race)].join(':');
const lookup=new Map(comparisons.races.map(r=>[key(r),r]));
const rows=[];
for(const record of capture.records||[]){
 if(record.response?.ready!==true)continue;
 const ranked=record.response.rankedScores,comparison=lookup.get(key(record));
 if(!comparison)throw Error('comparison_missing:'+key(record));
 if(!Array.isArray(ranked)||ranked.length!==6||new Set(ranked.map(x=>x.boat)).size!==6||ranked.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!Number.isFinite(x.score)))throw Error('invalid_saved_scores:'+key(record));
 const bySavedScore=[...ranked].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
 const top=bySavedScore[0];
 const byWinRate=comparison.byWinRate;
 const byST=comparison.byST;
 rows.push({date:record.date,venue:record.venue,race:record.race,bySavedScore,byPostHocWinRate:byWinRate,byPostHocST:byST,savedTopBoat:top,postHocWinRateTopBoat:byWinRate[0],postHocSTTopBoat:byST[0]??null,topMatchesPostHocWinRate:top===byWinRate[0],topMatchesPostHocST:top===byST[0],savedScores:ranked.map(x=>({boat:x.boat,score:x.score})),postHocOnly:true,preRaceInputsAuthenticated:false,calibrationEligible:false});
}
const report={raceCount:rows.length,topMatchesPostHocWinRate:rows.filter(x=>x.topMatchesPostHocWinRate).length,topMatchesPostHocST:rows.filter(x=>x.topMatchesPostHocST).length,rows,predictionAccuracyMeasured:false,calibrationEligible:false,warning:'This compares score outputs to post-hoc descriptive rankings. It is NOT a comparison against official race outcomes, and cannot validate or tune the historical model.'};
await fs.writeFile(path.join(dir,'saved-score-vs-posthoc-racer-comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log('Saved scores vs post-hoc racer comparison:',JSON.stringify({raceCount:report.raceCount,topMatchesPostHocWinRate:report.topMatchesPostHocWinRate,topMatchesPostHocST:report.topMatchesPostHocST,predictionAccuracyMeasured:false,calibrationEligible:false}));
console.log('First saved score comparison:',JSON.stringify(rows[0]&&{venue:rows[0].venue,race:rows[0].race,bySavedScore:rows[0].bySavedScore,byPostHocWinRate:rows[0].byPostHocWinRate,byPostHocST:rows[0].byPostHocST}));
