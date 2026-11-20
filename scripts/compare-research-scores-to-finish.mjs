// Offline-only score ranking versus independently verified race outcome.
// Analysis only: score order is NOT a historical authenticated prediction.
import {auditSavedResearchRace} from './audit-saved-research-race.mjs';
import {finishOrderByVerifiedEntryCourse} from './map-verified-finish-to-entry-course.mjs';
export function compareResearchScoresToFinish(snapshot,recent50,officialResult,courseMapping){
 const audit=auditSavedResearchRace(snapshot,recent50);
 if(audit.status!=='research_morning_audited')
  return {status:'held',reason:audit.reason||'score_audit_unavailable',eligibleForCalibration:false};
 if(officialResult?.date!==snapshot.date||Number(officialResult?.venue)!==Number(snapshot.venue)||
    Number(officialResult?.race)!==Number(snapshot.race))
  return {status:'held',reason:'race_identity_mismatch',eligibleForCalibration:false};
 const mapped=finishOrderByVerifiedEntryCourse(officialResult,courseMapping);
 if(mapped.status!=='mapped')
  return {status:'held',reason:mapped.reason,eligibleForCalibration:false};
 const scoreByBoat=new Map(audit.morning.ranked.map(r=>[r.boat,r.score]));
 const racerByBoat=new Map(snapshot.racers.map(r=>[r.boat,r]));
 const rows=mapped.finishByBoat.map((boat,i)=>({
  finishPosition:i+1,boat,entryCourse:mapped.finishByEntryCourse[i],
  racerId:racerByBoat.get(boat)?.racerId??null,
  morningScore:scoreByBoat.get(boat)??null
 }));
 return {status:'research_score_result_compared',date:snapshot.date,venue:snapshot.venue,race:snapshot.race,
  scoreRankedBoats:audit.morning.ranked.map(r=>r.boat),
  actualPodiumBoats:mapped.podiumByBoat,actualPodiumEntryCourses:mapped.podiumByEntryCourse,
  rows,eligibleForCalibration:false,authenticatedHistoricalPrediction:false,
  warning:'Descriptive score-vs-result comparison only; no predictive hit-rate or weight tuning until pre-race authentication is independently proven.'};
}
