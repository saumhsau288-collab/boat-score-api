// Diagnostic only: expose overlapping inputs without modifying production scores.
// A local 0.00 fallback repeats the national value in a second weighted term.
import {SCORE_WEIGHTS} from '../boat-score-2-scoring.js';
export function diagnoseScoreOverlap(racer) {
 const national=Number.isFinite(racer?.nationalWinRate);
 const localFallback=racer?.localWinRate===0&&national;
 const bothRates=national&&Number.isFinite(racer?.localWinRate);
 return {
  localFallbackUsed:localFallback,
  nationalWeight:SCORE_WEIGHTS.nationalWinRate,
  localWeight:SCORE_WEIGHTS.localWinRate,
  combinedNationalWeightWhenFallback:localFallback
   ? SCORE_WEIGHTS.nationalWinRate+SCORE_WEIGHTS.localWinRate:null,
  correlationWarning:bothRates?'national_and_local_win_rates_may_be_correlated':null,
  missingStartTiming:!Number.isFinite(racer?.startTiming),
  missingCourse:!Number.isInteger(racer?.course),
  note:'Diagnostic only. The existing score formula has no direct ST or course term; do not infer these are already modeled.'
 };
}
