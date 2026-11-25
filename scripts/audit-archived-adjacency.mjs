// Analyze immutable historical-research-data daily reports, descriptively only.
import fs from 'node:fs';
import {evaluatePositionModelHoldout} from './evaluate-position-model-holdout.mjs';
import {auditRelativeAbilityPlacement} from './audit-relative-ability-placement.mjs';
import {auditRateByBoatPlacement} from './audit-rate-by-boat-placement.mjs';
import path from 'node:path';
import {auditTopScoreWinThresholds} from './audit-top-score-win-thresholds.mjs';
import {auditSecondChoiceByBoatOneLocalAdvantage} from './audit-second-choice-by-boat-one-local-advantage.mjs';
import {auditTrifectaFriendlyProfiles} from './audit-trifecta-friendly-profiles.mjs';
import {auditBoatOneTopLocalAdvantage} from './audit-boat-one-top-local-advantage.mjs';
import {auditLocalAboveNational} from './audit-local-above-national.mjs';
import {evaluateSecondPlaceWhenBoatOneTop} from './evaluate-second-place-when-boat-one-top.mjs';
import {compareNationalVsNationalLocal} from './compare-national-vs-national-local.mjs';
import {auditBoatOneNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
import {selectBoatOneHighestAppScore} from './select-boat-one-highest-app-score.mjs';
import {auditBoatTwoVsThreeWhenOneTop} from './audit-boat-two-vs-three-when-one-top.mjs';
import {auditTopRatedBoatOneFinishPatterns} from './audit-top-rated-boat-one-finish-patterns.mjs';
import {evaluateTopRatedBoatOneOnly} from './evaluate-top-rated-boat-one-only.mjs';
import {auditProspectiveFeatureCoverage} from './audit-prospective-feature-coverage.mjs';
import {assessCandidatePromotion} from './assess-candidate-promotion.mjs';
import {evaluateCandidateTrifectaArchive} from './evaluate-candidate-trifecta-archive.mjs';
import {auditTopRatedBoatOne} from './audit-top-rated-boat-one.mjs';
import {auditHighAbilityInnerFinish} from './audit-high-ability-inner-finish.mjs';
import {auditOrderBenefitByAbilityGap} from './audit-order-benefit-by-ability-gap.mjs';
import {assessPairedDayStability} from './assess-paired-day-stability.mjs';
import {auditFixedWinnerPairedDays} from './audit-fixed-winner-paired-days.mjs';
import {evaluateFixedWinnerSecondThird} from './evaluate-fixed-winner-second-third.mjs';
import {diagnoseHoldoutOrderErrors} from './diagnose-holdout-order-errors.mjs';
import {auditSnapshotTiming} from './audit-snapshot-timing.mjs';
import {auditInsideGapUncertainty} from './audit-inside-gap-uncertainty.mjs';
import {auditInsideGapByWinner} from './audit-inside-gap-by-winner.mjs';
import {auditInsideAbilityGap} from './audit-inside-ability-gap.mjs';
import {auditInsideVersusAbility} from './audit-inside-versus-ability.mjs';
import {auditSecondThirdAbilityOrder} from './audit-second-third-ability-order.mjs';
import {auditDailyTripleCoverage} from './audit-daily-triple-coverage.mjs';
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
 const boatOneNationalLocalAverage=auditBoatOneNationalLocalAverage(rows);
 const nationalVsNationalLocal=compareNationalVsNationalLocal(rows);
 const localAboveNational=auditLocalAboveNational(rows);
 const boatOneTopLocalAdvantage=auditBoatOneTopLocalAdvantage(rows);
 const positionModelHoldout=reports.length>=3?evaluatePositionModelHoldout(reports):null;
 const relativeAbilityPlacement=auditRelativeAbilityPlacement(rows);
 const rateByBoatPlacement=auditRateByBoatPlacement(rows);
 const trifectaFriendlyProfiles=auditTrifectaFriendlyProfiles(rows);
 const sortedDates=[...dates].sort();
 const splitAt=Math.ceil(sortedDates.length*0.6);
 const earlyDates=sortedDates.slice(0,splitAt),laterDates=sortedDates.slice(splitAt);
 const trifectaProfileTimeSplit={earlyDates,laterDates,early:auditTrifectaFriendlyProfiles(rows.filter(r=>earlyDates.includes(String(r.date)))),later:auditTrifectaFriendlyProfiles(rows.filter(r=>laterDates.includes(String(r.date))))};
 const secondChoiceByBoatOneLocalAdvantage=auditSecondChoiceByBoatOneLocalAdvantage(rows);
 const topScoreWinThresholds=auditTopScoreWinThresholds(rows);
 const secondPlaceWhenBoatOneTop=evaluateSecondPlaceWhenBoatOneTop(rows);
 const boatOneActualAppScoreFilter=selectBoatOneHighestAppScore(rows).counts;
 const prospectiveFeatureCoverage=auditProspectiveFeatureCoverage(rows);
 const highAbilityInnerFinish=auditHighAbilityInnerFinish(reports);
 const candidateTrifectaHoldout=reports.length>=3?evaluateCandidateTrifectaArchive(reports):null;
 const topRatedBoatOneOnly=reports.length>=3?evaluateTopRatedBoatOneOnly(reports):null;
 const topRatedBoatOneFinishPatterns=reports.length>=3?auditTopRatedBoatOneFinishPatterns(reports):null;
 const boatTwoVsThreeWhenOneTop=reports.length>=3?auditBoatTwoVsThreeWhenOneTop(reports):null;
 const candidatePromotionGate=candidateTrifectaHoldout?assessCandidatePromotion(candidateTrifectaHoldout):null;
 const topRatedBoatOne=auditTopRatedBoatOne(rows);
 const orderBenefitByAbilityGap=reports.length>=3?auditOrderBenefitByAbilityGap(reports):null;
 const fixedWinnerPairedDays=reports.length>=3?auditFixedWinnerPairedDays(reports):null;
 const pairedDayStability=fixedWinnerPairedDays?assessPairedDayStability(fixedWinnerPairedDays):null;
 const fixedWinnerSecondThird=reports.length>=3?evaluateFixedWinnerSecondThird(reports):null;
 const orderErrorDiagnosis=reports.length>=3?diagnoseHoldoutOrderErrors(reports,twoStage.selected):null;
 const promotionGate=twoStage?assessArchivePromotion({candidate:twoStage.holdout,baseline:twoStage.frameOnlyHoldout,verifiedPreRaceCount:readiness.verifiedPreRaceRates}):null;
 return {positionModelHoldout,relativeAbilityPlacement,rateByBoatPlacement,topScoreWinThresholds,trifectaFriendlyProfiles,trifectaProfileTimeSplit,secondChoiceByBoatOneLocalAdvantage,boatOneTopLocalAdvantage,localAboveNational,secondPlaceWhenBoatOneTop,nationalVsNationalLocal,boatOneNationalLocalAverage,boatOneActualAppScoreFilter,boatTwoVsThreeWhenOneTop,topRatedBoatOneFinishPatterns,topRatedBoatOneOnly,prospectiveFeatureCoverage,candidatePromotionGate,candidateTrifectaHoldout,highAbilityInnerFinish,topRatedBoatOne,orderBenefitByAbilityGap,pairedDayStability,fixedWinnerPairedDays,fixedWinnerSecondThird,orderErrorDiagnosis,...auditOfficialJoinAdjacency({records:rows}),conditionalFinishOrder:auditConditionalFinishOrder(rows),secondThirdAbilityOrder:auditSecondThirdAbilityOrder(rows),insideVersusAbility:auditInsideVersusAbility(rows),insideAbilityGap:auditInsideAbilityGap(rows),insideGapByWinner:auditInsideGapByWinner(rows),insideGapUncertainty:auditInsideGapUncertainty(auditInsideGapByWinner(rows)),orderedTripleHoldout:reports.length>=3?evaluateOrderedTriples(reports):null,orderedTripleCoverage:reports.length>=3?evaluateOrderedTripleCoverage(reports):null,dailyTripleCoverage:reports.length>=3?auditDailyTripleCoverage(reports):null,finishOrderPairs:auditFinishOrderPairs(rows),topThreePatterns:auditTopThreeSandwich(rows),archivedAbilityPlacement:auditArchivedAbilityPlacement(rows),separatedTopTwo:auditSeparatedTopTwo(rows),gapStrata:auditGapStrata(rows),interveningCandidates:auditInterveningCandidates(rows),interveningByBoat:auditInterveningByBoat(rows),interveningFrameBaseline:auditInterveningVsFrameBaseline(rows),betweenVsNotBetween:auditBetweenVsNotBetween(rows),betweenByRank:auditBetweenByCandidateRank(rows),dailyAbilityRank:auditDailyAbilityRank(rows),prospectiveReadiness:readiness,snapshotTiming:auditSnapshotTiming(rows),promotionGate,holdoutWinnerConfusion:twoStage?auditHoldoutWinnerConfusion(reports,twoStage.selected):null,holdoutOrderByWinner:twoStage?auditHoldoutOrderByWinner(reports,twoStage.selected):null,chronologicalHeuristics:reports.length>=2?evaluateChronologicalHeuristics(reports):null,twoStageArchive:twoStage,archiveDays:dates.size,archiveDates:[...dates].sort()};
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
  console.log(JSON.stringify({topScoreWinThresholds:result.topScoreWinThresholds,secondChoiceByBoatOneLocalAdvantage:result.secondChoiceByBoatOneLocalAdvantage,trifectaFriendlyProfiles:result.trifectaFriendlyProfiles,trifectaProfileTimeSplit:result.trifectaProfileTimeSplit,boatOneTopLocalAdvantage:result.boatOneTopLocalAdvantage,localAboveNational:result.localAboveNational,secondPlaceWhenBoatOneTop:result.secondPlaceWhenBoatOneTop,nationalVsNationalLocal:result.nationalVsNationalLocal,boatOneNationalLocalAverage:result.boatOneNationalLocalAverage,boatOneActualAppScoreFilter:result.boatOneActualAppScoreFilter,boatTwoVsThreeWhenOneTop:result.boatTwoVsThreeWhenOneTop,topRatedBoatOneFinishPatterns:result.topRatedBoatOneFinishPatterns,topRatedBoatOneOnly:result.topRatedBoatOneOnly,candidatePromotionGate:result.candidatePromotionGate,candidateTrifectaHoldout:result.candidateTrifectaHoldout,highAbilityInnerFinish:result.highAbilityInnerFinish,topRatedBoatOne:result.topRatedBoatOne,orderBenefitByAbilityGap:result.orderBenefitByAbilityGap,pairedDayStability:result.pairedDayStability,fixedWinnerPairedDays:result.fixedWinnerPairedDays,fixedWinnerSecondThird:result.fixedWinnerSecondThird,orderErrorDiagnosis:result.orderErrorDiagnosis,archiveDays:result.archiveDays,eligible:result.eligible,excluded:result.excluded,byWinningBoat:result.byWinningBoat,orderedTripleHoldout:result.orderedTripleHoldout,orderedTripleCoverage:result.orderedTripleCoverage,dailyTripleCoverage:result.dailyTripleCoverage,conditionalFinishOrder:result.conditionalFinishOrder,secondThirdAbilityOrder:result.secondThirdAbilityOrder,insideVersusAbility:result.insideVersusAbility,insideAbilityGap:result.insideAbilityGap,insideGapByWinner:result.insideGapByWinner,insideGapUncertainty:result.insideGapUncertainty,finishOrderPairs:result.finishOrderPairs,topThreePatterns:result.topThreePatterns,archivedAbilityPlacement:result.archivedAbilityPlacement,separatedTopTwo:result.separatedTopTwo,gapStrata:result.gapStrata,interveningCandidates:result.interveningCandidates,interveningByBoat:result.interveningByBoat,interveningFrameBaseline:result.interveningFrameBaseline,betweenVsNotBetween:result.betweenVsNotBetween,betweenByRank:result.betweenByRank,dailyAbilityRank:result.dailyAbilityRank,prospectiveFeatureCoverage:result.prospectiveFeatureCoverage,prospectiveReadiness:result.prospectiveReadiness,snapshotTiming:result.snapshotTiming,chronologicalHeuristics:result.chronologicalHeuristics,twoStageArchive:result.twoStageArchive,promotionGate:result.promotionGate,holdoutOrderByWinner:result.holdoutOrderByWinner,holdoutWinnerConfusion:result.holdoutWinnerConfusion}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
