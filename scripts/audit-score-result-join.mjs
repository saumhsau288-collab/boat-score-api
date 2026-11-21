// Research-only: attach six-boat output score presence to strict saved-result eligibility.
import {compareSavedCaptureWithVerifiedResults} from './compare-saved-capture-results.mjs';
import {auditCapturedRankedScores} from './audit-captured-ranked-scores.mjs';
export function auditScoreResultJoin(capture,officialResults){
 const comparison=compareSavedCaptureWithVerifiedResults(capture,officialResults);
 const scores=auditCapturedRankedScores(capture);
 const rows=comparison.rows.map((row,i)=>({
  date:row.date,venue:row.venue,race:row.race,
  comparisonStatus:row.status,holdReasons:row.reasons,
  sixBoatOutputScoresPresent:scores.cases[i]?.sixBoatOutputScoresPresent===true,
  eligibleForCalibration:false
 }));
 return {scope:'SAVED_OUTPUT_SCORE_RESULT_JOIN_READINESS',
  readyResponses:scores.readyResponses,
  validSixBoatOutputScoreSets:scores.validSixBoatOutputScoreSets,
  resultComparisonsEligible:comparison.compared,
  resultComparisonsHeld:comparison.held,
  holdReasons:comparison.holdReasons,rows,
  weightChangesPermitted:false,
  warning:'Output scores are not feature inputs. This report never authorizes calibration; independently verified results and authenticated pre-race evidence remain mandatory.'};
}
