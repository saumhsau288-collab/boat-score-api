// Offline evaluation of existing score ranking against verified historical results.
// Never derives features from finish order or changes production weights.
import {comparePreRaceEvidence} from './boat-score-2-pre-race-evidence.js';
export function compareHistoricalRace(snapshot) {
 if(!snapshot || snapshot.preRaceSnapshot!==true || snapshot.resultVerified!==true ||
   !Array.isArray(snapshot.finishOrder)||snapshot.finishOrder.length!==6 ||
   new Set(snapshot.finishOrder).size!==6 ||
   snapshot.finishOrder.some(b=>!Number.isInteger(b)||b<1||b>6))
  return {status:'unverified_result'};
 const comparison=comparePreRaceEvidence(snapshot.racers,snapshot.evidenceByRacerId);
 if(comparison.status==='invalid_race')return {status:'invalid_race'};
 if(comparison.baseScoresAvailable!==6)return {status:'incomplete_base_scores',
  evidenceStatus:comparison.status};
 const ranked=[...comparison.racers].sort((a,b)=>b.baseScore-a.baseScore||a.boat-b.boat);
 const predicted=ranked.map(r=>r.boat);
 const actual=snapshot.finishOrder;
 return {status:'evaluated',predicted,actual,
  winnerHit:predicted[0]===actual[0],
  topThreeSetHit:predicted.slice(0,3).every(b=>actual.slice(0,3).includes(b)),
  exactTopThreeHit:predicted.slice(0,3).every((b,i)=>b===actual[i]),
  evidenceStatus:comparison.status,
  verifiedCourseCount:comparison.verifiedCourseCount,
  verifiedStartCount:comparison.verifiedStartCount,
  scoreChangeApplied:false,
  warning:'Existing base-score ranking only. Course/ST evidence is not yet included in scoring.'};
}
export function summarizeHistoricalComparisons(snapshots) {
 if(!Array.isArray(snapshots))return {status:'invalid_input'};
 const evaluated=snapshots.map(compareHistoricalRace).filter(x=>x.status==='evaluated');
 const n=evaluated.length;
 return {status:n?'evaluated':'no_eligible_races',total:snapshots.length,eligible:n,
  excluded:snapshots.length-n,winnerHits:evaluated.filter(x=>x.winnerHit).length,
  topThreeSetHits:evaluated.filter(x=>x.topThreeSetHit).length,
  exactTopThreeHits:evaluated.filter(x=>x.exactTopThreeHit).length,
  winnerRate:n?evaluated.filter(x=>x.winnerHit).length/n:null,
  scoreChangeApplied:false};
}
