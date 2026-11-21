// Research-only: attach six-boat output score presence to strict saved-result eligibility.
import {readFileSync} from 'node:fs';
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

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [capturePath,resultsPath]=process.argv.slice(2);
 if(!capturePath)throw Error('Usage: node scripts/audit-score-result-join.mjs capture.json [verified-results.json]');
 const capture=JSON.parse(readFileSync(capturePath,'utf8'));
 const officialResults=resultsPath?JSON.parse(readFileSync(resultsPath,'utf8')).results:[];
 if(!Array.isArray(officialResults))throw Error('invalid_official_results');
 console.log(JSON.stringify(auditScoreResultJoin(capture,officialResults),null,2));
}
