// Research-only disagreement audit. Post-hoc descriptive comparison, not prediction accuracy.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const source=JSON.parse(await fs.readFile(path.join(dir,'saved-score-vs-posthoc-racer-comparison.json'),'utf8'));
const rows=source.rows.map(r=>{
 const savedTop=r.bySavedScore[0], winTop=r.byPostHocWinRate[0], stTop=r.byPostHocST[0]??null;
 const savedScoreByBoat=Object.fromEntries(r.savedScores.map(x=>[x.boat,x.score]));
 return {date:r.date,venue:r.venue,race:r.race,savedTopBoat:savedTop,postHocWinRateTopBoat:winTop,postHocSTTopBoat:stTop,winRateDisagrees:savedTop!==winTop,stDisagrees:stTop!==null&&savedTop!==stTop,stTopMissing:stTop===null,savedTopScore:savedScoreByBoat[savedTop],postHocWinRateTopSavedScore:savedScoreByBoat[winTop],postHocSTTopSavedScore:stTop===null?null:savedScoreByBoat[stTop],scoreGapVsWinRateTop:savedScoreByBoat[savedTop]-savedScoreByBoat[winTop],scoreGapVsSTTop:stTop===null?null:savedScoreByBoat[savedTop]-savedScoreByBoat[stTop],preRaceAuthenticated:false,calibrationEligible:false};
});
const report={raceCount:rows.length,winRateDisagreementCount:rows.filter(x=>x.winRateDisagrees).length,stDisagreementCount:rows.filter(x=>x.stDisagrees).length,rows,warning:'Differences are descriptive. No official finishing results or independently authenticated pre-race inputs were compared. Do not adjust production weights from these discrepancies.',predictionAccuracyMeasured:false,calibrationEligible:false};
await fs.writeFile(path.join(dir,'research-score-disagreements.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research score disagreement audit:',JSON.stringify({raceCount:report.raceCount,winRateDisagreementCount:report.winRateDisagreementCount,stDisagreementCount:report.stDisagreementCount,calibrationEligible:false}));
console.log('Win-rate disagreement examples:',JSON.stringify(rows.filter(x=>x.winRateDisagrees).slice(0,5)));
