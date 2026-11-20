// Evidence-gated summary for score-weight review. No changes to scoring.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const data=JSON.parse(await fs.readFile(path.join(dir,'severe-disagreement-racer-attributes.json'),'utf8'));
const rows=data.rows;
const stats={
  races:rows.length,
  winnerLowerWinRate:rows.filter(r=>r.comparison.winRateAverageWinnerMinusSavedTop<0).length,
  winnerHigherWinRate:rows.filter(r=>r.comparison.winRateAverageWinnerMinusSavedTop>0).length,
  winnerFasterAverageST:rows.filter(r=>r.comparison.averageSTWinnerMinusSavedTop!==null&&r.comparison.averageSTWinnerMinusSavedTop<0).length,
  winnerSlowerAverageST:rows.filter(r=>r.comparison.averageSTWinnerMinusSavedTop!==null&&r.comparison.averageSTWinnerMinusSavedTop>0).length,
  winnerSameAverageST:rows.filter(r=>r.comparison.averageSTWinnerMinusSavedTop===0).length,
  winnerLowerNumberedBoat:rows.filter(r=>r.comparison.boatNumberWinnerMinusSavedTop<0).length,
  winnerHigherNumberedBoat:rows.filter(r=>r.comparison.boatNumberWinnerMinusSavedTop>0).length,
  winnerHigherMotorTwoWinRate:rows.filter(r=>r.actualWinner.motorTwoWinRate>r.savedTop.motorTwoWinRate).length,
  winnerLowerMotorTwoWinRate:rows.filter(r=>r.actualWinner.motorTwoWinRate<r.savedTop.motorTwoWinRate).length
};
const report={stats,reviewCandidates:['Verify actual entry course before attributing advantage to boat number','Acquire time-stamped exhibition and start data for original prediction','Review high-score fifth-place cases against complete six-racer original input vectors'],doNotChangeWeights:true,reason:'Small selected post-hoc sample, absent authenticated original feature vectors, unverified entry courses and no controlled out-of-sample test.',preRaceAuthenticated:false,calibrationEligible:false};
await fs.writeFile(path.join(dir,'score-weight-review-evidence-gate.json'),JSON.stringify(report,null,2)+'\n');
console.log('Score weight review evidence gate:',JSON.stringify(report));
