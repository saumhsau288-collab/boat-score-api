// Analyze immutable historical-research-data daily reports, descriptively only.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateOrderedTripleCoverage} from './evaluate-ordered-triple-coverage.mjs';
import {evaluateOrderedTriples} from './evaluate-ordered-triples.mjs';
import {auditConditionalFinishOrder} from './audit-conditional-finish-order.mjs';
import {auditHoldoutWinnerConfusion} from './audit-holdout-winner-confusion.mjs';
import {auditHoldoutOrderByWinner} from './audit-holdout-order-by-winner.mjs';
import {assessArchivePromotion} from './assess-archive-promotion.mjs';
import {evaluateTwoStageArchive} from './evaluate-two-stage-archive.mjs';
import {evaluateChronologicalHeuristics} from './evaluate-chronological-heuristics.mjs';
import {auditProspectiveReadiness} from './audit-prospective-readiness.mjs';
import {auditDailyAbilityRank} from './audit-daily-ability-rank.mjs';
import {auditBetweenByCandidateRank} from './audit-between-by-rank.mjs';
import {auditBetweenVsNotBetween} from './audit-between-vs-not-between.mjs';
import {auditInterveningVsFrameBaseline} from './audit-intervening-frame-baseline.mjs';
import {auditInterveningByBoat} from './audit-intervening-by-boat.mjs';
import {auditInterveningCandidates} from './audit-intervening-candidates.mjs';
import {auditGapStrata} from './audit-gap-strata.mjs';
import {auditSeparatedTopTwo} from './audit-separated-top-two.mjs';
import {auditArchivedAbilityPlacement} from './audit-archived-ability-placement.mjs';
import {auditTopThreeSandwich} from './audit-top-three-sandwich.mjs';
import {auditFinishOrderPairs} from './audit-finish-order-pairs.mjs';
import {auditOfficialJoinAdjacency} from './audit-official-join-adjacency.mjs';
export function aggregateArchivedDailyReports(reports) {
 if(!Array.isArray(reports))throw new TypeError('reports must be an array');
 const rows=[];const dates=new Set();
 for(const day of reports){
  if(!/^20\d{6}$/.test(String(day?.date))||!Array.isArray(day?.reports))throw new Error('invalid daily report');
  if(dates.has(day.date))throw new Error('duplicate archive date');
  dates.add(day.date);
  for(const venue of day.reports) {
   if(!Array.isArray(venue?.records))throw new Error('invalid venue records');
   for(const record of venue.records) {
    if(String(record.date)!==String(day.date))throw new Error('race date mismatch');
    rows.push(record);
   }
  }
 }
 const twoStage=reports.length>=3?evaluateTwoStageArchive(reports):null;
 const readiness=auditProspectiveReadiness(rows);
 const promotionGate=twoStage?assessArchivePromotion({candidate:twoStage.holdout,baseline:twoStage.frameOnlyHoldout,verifiedPreRaceCount:readiness.verifiedPreRaceRates}):null;
 return {...auditOfficialJoinAdjacency({records:rows}),conditionalFinishOrder:auditConditionalFinishOrder(rows),orderedTripleHoldout:reports.length>=3?evaluateOrderedTriples(reports):null,orderedTripleCoverage:reports.length>=3?evaluateOrderedTripleCoverage(reports):null,finishOrderPairs:auditFinishOrderPairs(rows),topThreePatterns:auditTopThreeSandwich(rows),archivedAbilityPlacement:auditArchivedAbilityPlacement(rows),separatedTopTwo:auditSeparatedTopTwo(rows),gapStrata:auditGapStrata(rows),interveningCandidates:auditInterveningCandidates(rows),interveningByBoat:auditInterveningByBoat(rows),interveningFrameBaseline:auditInterveningVsFrameBaseline(rows),betweenVsNotBetween:auditBetweenVsNotBetween(rows),betweenByRank:auditBetweenByCandidateRank(rows),dailyAbilityRank:auditDailyAbilityRank(rows),prospectiveReadiness:readiness,promotionGate,holdoutWinnerConfusion:twoStage?auditHoldoutWinnerConfusion(reports,twoStage.selected):null,holdoutOrderByWinner:twoStage?auditHoldoutOrderByWinner(reports,twoStage.selected):null,chronologicalHeuristics:reports.length>=2?evaluateChronologicalHeuristics(reports):null,twoStageArchive:twoStage,archiveDays:dates.size,archiveDates:[...dates].sort()};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href) {
 try {
  const dir=process.argv[2],output=process.argv[3];
  if(!dir||!output)throw new Error('usage: node scripts/audit-archived-adjacency.mjs verified-daily output.json');
  const files=fs.readdirSync(dir).filter(x=>/^20\d{6}\.json$/.test(x)).sort();
  if(!files.length)throw new Error('no daily archive files');
  const reports=files.map(file=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')));
  const result=aggregateArchivedDailyReports(reports);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({archiveDays:result.archiveDays,eligible:result.eligible,excluded:result.excluded,byWinningBoat:result.byWinningBoat,orderedTripleHoldout:result.orderedTripleHoldout,orderedTripleCoverage:result.orderedTripleCoverage,conditionalFinishOrder:result.conditionalFinishOrder,finishOrderPairs:result.finishOrderPairs,topThreePatterns:result.topThreePatterns,archivedAbilityPlacement:result.archivedAbilityPlacement,separatedTopTwo:result.separatedTopTwo,gapStrata:result.gapStrata,interveningCandidates:result.interveningCandidates,interveningByBoat:result.interveningByBoat,interveningFrameBaseline:result.interveningFrameBaseline,betweenVsNotBetween:result.betweenVsNotBetween,betweenByRank:result.betweenByRank,dailyAbilityRank:result.dailyAbilityRank,prospectiveReadiness:result.prospectiveReadiness,chronologicalHeuristics:result.chronologicalHeuristics,twoStageArchive:result.twoStageArchive,promotionGate:result.promotionGate,holdoutOrderByWinner:result.holdoutOrderByWinner,holdoutWinnerConfusion:result.holdoutWinnerConfusion}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
