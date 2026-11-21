// Opportunity-adjusted descriptive comparison; does not establish causality or forecast skill.
import {auditAdjacentPodium} from './audit-adjacent-podium.mjs';
export function auditAdjacentAgainstChance(records) {
  const report=auditAdjacentPodium(records);
  const byWinningBoat={};
  for(const [boat,entry] of Object.entries(report.byWinningBoat)) {
    const neighbors=(Number(boat)===1||Number(boat)===6)?1:2;
    // Conditional on the winner, second/third are two distinct draws from five boats.
    const expectedSecondRate=neighbors/5;
    const expectedPodiumRate=1-((5-neighbors)/5)*((4-neighbors)/4);
    byWinningBoat[boat]={...entry,neighbors,expectedSecondRate,expectedPodiumRate,
      secondRate:entry.races?entry.neighborSecond/entry.races:null,
      podiumRateDifference:entry.races?entry.neighborPodium/entry.races-expectedPodiumRate:null,
      expectedPodiumCount:entry.races*expectedPodiumRate};
  }
  return {...report,byWinningBoat,
    baseline:'uniform ordering of remaining five boats conditional on observed winner',
    warning:'Uniform baseline ignores skill, course, ST and other dependencies. Do not interpret differences as predictive evidence or deploy score changes.'};
}
