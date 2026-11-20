// Surface concrete races where score rank and official finish diverge.
// Retrospective descriptive evidence only, not prospective accuracy.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const comparison=JSON.parse(await fs.readFile(path.join(dir,'saved-scores-vs-official-finishes.json'),'utf8'));
const rows=comparison.rows.filter(r=>r.verifiedFinish).map(r=>{
 const savedTopBoat=r.savedScoreOrder[0];
 const savedTopFinish=r.officialFinishOrder.indexOf(savedTopBoat)+1;
 const actualWinner=r.officialFinishOrder[0];
 const actualWinnerScoreRank=r.savedScoreOrder.indexOf(actualWinner)+1;
 return {date:r.date,venue:r.venue,race:r.race,savedTopBoat,savedTopFinish,actualWinner,actualWinnerScoreRank,officialFinishOrder:r.officialFinishOrder,savedScoreOrder:r.savedScoreOrder,sourceUrl:r.officialResultSource,preRaceAuthenticated:false};
});
const severe=rows.filter(r=>r.savedTopFinish>=5||r.actualWinnerScoreRank>=5);
const out={verifiedRaces:rows.length,severeDisagreementRaces:severe.length,savedTopFinishedFifthOrWorse:rows.filter(r=>r.savedTopFinish>=5).length,actualWinnerRankedFifthOrWorse:rows.filter(r=>r.actualWinnerScoreRank>=5).length,severe,preRaceAuthenticated:false,calibrationEligible:false,warning:'Post-hoc examples for investigation, not authenticated pre-race predictions or proof of a scoring defect.'};
await fs.writeFile(path.join(dir,'saved-score-severe-disagreements.json'),JSON.stringify(out,null,2)+'\n');
console.log('Saved score severe disagreement cases:',JSON.stringify(out));
