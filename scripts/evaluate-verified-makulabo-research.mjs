// Research-only bridge. Preserve Makulabo first-place percentage separately from
// the morning engine's recent50WinRate; these are not interchangeable metrics.
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';
import {joinMakulaboWithOfficial} from '../boat-score-2-makulabo-official-join.js';
import {evaluateCapturedResearchSnapshot} from './evaluate-captured-research-snapshot.mjs';

export function evaluateVerifiedMakulaboResearch(snapshot,extracted){
 if(snapshot?.status!=='captured_research_inputs'||snapshot?.source!=='verified_official_metrics'||
    !Array.isArray(snapshot.racers)||snapshot.racers.some(r=>r.sourceVerified!==true)||
    !validateOfficialMetrics(snapshot.racers).verified)
  return {status:'held',reason:'verified_official_six_required',eligibleForCalibration:false};
 const joined=joinMakulaboWithOfficial(snapshot.racers,extracted);
 if(!joined.verified)
  return {status:'held',reason:joined.reason,eligibleForCalibration:false};
 const summary={status:'makulabo_identity_joined',date:snapshot.date,venue:snapshot.venue,race:snapshot.race,
  racers:joined.racers.map(r=>({boat:r.boat,racerId:r.racerId,runs:r.runs,
   firstPlaceRate:r.firstPlaceRate,top2Rate:r.top2Rate,top3Rate:r.top3Rate,
   matchMethod:r.matchMethod})),eligibleForCalibration:false,
  morningScoreApplied:false};
 // The verified table gives first-place percentages, not necessarily the
 // recent50WinRate required by the existing scoring pipeline.
 // Accept a separately authenticated winRate only when the adapter supplies it.
 const records=Array.isArray(extracted?.verifiedWinRates)?extracted.verifiedWinRates:[];
 const byId=new Map(records.map(r=>[String(r?.racerId),r]));
 const recent50=joined.racers.map(r=>byId.get(r.racerId));
 if(records.length!==6||byId.size!==6||recent50.some(r=>!r||r.verified!==true||r.sourceVerified!==true||
    typeof r.winRate!=='number'||!Number.isFinite(r.winRate)||r.winRate<0||r.winRate>100))
  return {...summary,reason:'verified_recent50_win_rate_required_not_first_place_percentage'};
 const scored=evaluateCapturedResearchSnapshot(snapshot,recent50);
 if(scored.status!=='evaluated')
  return {...summary,reason:scored.reason,scoreStatus:'held'};
 return {...summary,status:'research_morning_evaluated',morningScoreApplied:true,
  score:scored,warning:'Research-only retrospective scoring; not authenticated before race.'};
}
