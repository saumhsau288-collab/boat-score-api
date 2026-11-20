// Research-only decomposition of saved-score disagreements by boat position.
// Boat number is NOT verified starting course; no causal conclusions.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const audit=JSON.parse(await fs.readFile(path.join(dir,'research-score-disagreements.json'),'utf8'));
const rows=audit.rows.filter(r=>r.winRateDisagrees).map(r=>({
 date:r.date,venue:r.venue,race:r.race,
 savedTopBoat:r.savedTopBoat,winRateTopBoat:r.postHocWinRateTopBoat,
 savedTopIsInnerBoatNumber:r.savedTopBoat<r.postHocWinRateTopBoat,
 savedTopIsOuterBoatNumber:r.savedTopBoat>r.postHocWinRateTopBoat,
 scoreGap:r.scoreGapVsWinRateTop,
 boatNumberNotVerifiedEntryCourse:true,
 preRaceInputsAuthenticated:false,
 weightTuningEligible:false
}));
const report={disagreementRaces:rows.length,innerBoatNumberFavored:rows.filter(r=>r.savedTopIsInnerBoatNumber).length,outerBoatNumberFavored:rows.filter(r=>r.savedTopIsOuterBoatNumber).length,rows,warning:'Boat numbers are not verified entry courses. Post-hoc comparisons do not establish why scores differ, actual finish, or valid weight changes.',calibrationEligible:false};
await fs.writeFile(path.join(dir,'research-disagreement-boat-position.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research disagreement boat-position audit:',JSON.stringify({disagreementRaces:report.disagreementRaces,innerBoatNumberFavored:report.innerBoatNumberFavored,outerBoatNumberFavored:report.outerBoatNumberFavored,calibrationEligible:false}));
