// Research-only safety gate: candidate schedules must never drive requests.
// A future caller must provide an independently verified official cutoff.
export function selectResearchVerifiedRefreshes({schedule,verifiedCutoffs=[]}={}){
 if(!schedule||schedule.status!=='daily_candidates_not_authenticated'||!Array.isArray(schedule.candidates))
  return {status:'invalid_candidate_schedule',authorized:[],rejected:[]};
 const authorized=[],rejected=[];
 for(const candidate of schedule.candidates){
  const matches=verifiedCutoffs.filter(v=>v&&v.date===schedule.date&&v.venue===schedule.venue&&v.race===candidate.race);
  if(matches.length!==1){rejected.push({race:candidate.race,reason:matches.length?'ambiguous_verified_cutoff':'verified_cutoff_missing'});continue;}
  const verified=matches[0];
  if(verified.verified!==true||verified.source!=='official'||typeof verified.sourceUrl!=='string'||!/^https:\/\/www\.boatrace\.jp\//.test(verified.sourceUrl)){
   rejected.push({race:candidate.race,reason:'cutoff_not_independently_verified'});continue;
  }
  if(typeof verified.cutoffAt!=='string'||!Number.isFinite(Date.parse(verified.cutoffAt))){
   rejected.push({race:candidate.race,reason:'invalid_verified_cutoff'});continue;
  }
  const target=new Date(Date.parse(verified.cutoffAt)-600000).toISOString();
  if(target!==candidate.refreshCandidateAt){
   rejected.push({race:candidate.race,reason:'candidate_conflicts_with_verified_cutoff'});continue;
  }
  // A caller-provided verified:true is not independent authentication. Never authorize.
  rejected.push({race:candidate.race,reason:'independent_authentication_not_implemented'});
 }
 return {status:'independent_authentication_required_no_network_execution',authorized,rejected,networkExecuted:false};
}
