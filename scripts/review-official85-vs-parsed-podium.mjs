// Research only: inspect official ability component versus a same-source parsed podium.
// A retrospective comparison is NOT an authenticated historical forecast.
import {scoreResearchOfficial85} from './compare-research-official-baseline.mjs';

const hold=reason=>({status:'held',reason,eligibleForCalibration:false,
 authenticatedHistoricalPrediction:false,scoreChangeApplied:false});
export function reviewOfficial85VsParsedPodium(snapshot,result){
 const scored=scoreResearchOfficial85(snapshot);
 if(scored.status!=='official_85_component_scored')
  return hold(scored.reason??'official_metrics_unavailable');
 if(result?.date!==snapshot.date||Number(result?.venue)!==Number(snapshot.venue)||
  Number(result?.race)!==Number(snapshot.race))
  return hold('race_identity_mismatch');
 if(result?.status!=='official_racelist_result_identity_matched'||
  result?.parsedStatus!=='parsed_needs_independent_review'||
  result?.identityCheck?.status!=='official_racelist_result_identity_matched')
  return hold('identity_matched_parsed_podium_required');
 const podium=result.parsedPodium;
 if(!Array.isArray(podium)||podium.length!==3||new Set(podium).size!==3||
  podium.some(boat=>!Number.isInteger(boat)||boat<1||boat>6))
  return hold('valid_three_boat_podium_required');
 const ranked=[...scored.rows].sort((a,b)=>
  b.officialComponentScore85-a.officialComponentScore85||a.boat-b.boat);
 if(podium.some(boat=>!ranked.some(row=>row.boat===boat)))
  return hold('podium_boat_missing_from_official_racelist');
 const ranks=podium.map(boat=>ranked.findIndex(row=>row.boat===boat)+1);
 const overlap=ranked.slice(0,3).filter(row=>podium.includes(row.boat)).length;
 const exact=ranked.slice(0,3).every((row,i)=>row.boat===podium[i]);
 return {status:'research_only_podium_compared',
  date:snapshot.date,venue:snapshot.venue,race:snapshot.race,
  scoreRanking:ranked.map(row=>row.boat),
  rankedOfficial85:ranked.map(({boat,officialComponentScore85,localRateFallbackApplied})=>
   ({boat,score:officialComponentScore85,localRateFallbackApplied})),
  parsedPodium:podium.slice(),actualPodiumScoreRanks:ranks,
  winnerScoreRank:ranks[0],secondScoreRank:ranks[1],thirdScoreRank:ranks[2],
  top3Overlap:overlap,highestScoreWon:ranks[0]===1,exactTop3Order:exact,
  independentResultVerification:false,preRaceAuthenticated:false,
  authenticatedHistoricalPrediction:false,eligibleForCalibration:false,
  scoreChangeApplied:false,
  note:'Retrospective official-only 85-point comparison. Result and racelist are same-source. No verified entry courses, full morning score, probability, 3連単予想実績 or calibration.'};
}
