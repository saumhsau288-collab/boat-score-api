import {inspectResearchRaceCutoffCandidate} from './inspect-research-race-cutoff-candidate.mjs';
// Candidate schedule is not authorized to trigger real network refreshes.
export function planResearchUnverifiedRefresh({html,requestedUrl,responseUrl,race}={}){
 const candidate=inspectResearchRaceCutoffCandidate({html,requestedUrl,responseUrl,race});
 if(candidate.status!=='race_cutoff_candidate_needs_independent_authentication')
  return {status:'no_usable_candidate',candidateStatus:candidate.status,refreshAuthorized:false};
 const [hour,minute]=candidate.localTimeJst.split(':').map(Number);
 const d=new Date(Date.UTC(Number(race.date.slice(0,4)),Number(race.date.slice(4,6))-1,Number(race.date.slice(6,8)),hour-9,minute-10));
 return {status:'candidate_refresh_time_not_authorized',race,cutoffCandidateJst:candidate.localTimeJst,refreshCandidateAt:d.toISOString(),refreshAuthorized:false,verified:false};
}
