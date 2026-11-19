// Research-only candidate weights. Not deployed; not calibrated or guaranteed.
// Every input must be known before race cutoff. Missing inputs must be flagged,
// not silently replaced with post-race start times or outcomes.
export const researchWeightCandidate=Object.freeze({
 racerWinRateAverage:45,
 preRaceStartAbility:25,
 expectedEntryCourse:15,
 motorPerformance:10,
 verifiedExhibitionAndWeather:5
});
export const researchTarget=Object.freeze({
 metric:'trifecta_any_of_six_main_tickets_hit_rate',
 targetRate:0.60,
 targetIsGuarantee:false,
 minimumHoldoutRaces:100,
 status:'unvalidated_research_only'
});
export function validateResearchWeights(weights=researchWeightCandidate){
 const keys=Object.keys(researchWeightCandidate);
 return Object.keys(weights).length===keys.length&&keys.every(k=>Number.isFinite(weights[k])&&weights[k]>=0&&weights[k]<=100)&&
  keys.reduce((s,k)=>s+weights[k],0)===100;
}
export function evaluateSixTicketHoldout(records,{minimumRaces=researchTarget.minimumHoldoutRaces}={}){
 if(!Number.isInteger(minimumRaces)||minimumRaces<1)throw Error('Invalid minimum races');
 let eligible=0,hits=0,rejected=0;const seen=new Set();
 for(const row of records||[]){
  const {date,venue,race,tickets,actualTrifecta,preRaceSnapshotVerified,resultIndependentlyVerified,chronologicalHoldout}=row||{};
  const key=[date,venue,race].join(':');
  const valid=preRaceSnapshotVerified===true&&resultIndependentlyVerified===true&&chronologicalHoldout===true&&
   /^20\\d{6}$/.test(String(date))&&Number.isInteger(venue)&&venue>=1&&venue<=24&&Number.isInteger(race)&&race>=1&&race<=12&&
   Array.isArray(tickets)&&tickets.length===6&&tickets.every(t=>/^[1-6]{3}$/.test(t)&&new Set(t).size===3)&&new Set(tickets).size===6&&
   typeof actualTrifecta==='string'&&/^[1-6]{3}$/.test(actualTrifecta)&&new Set(actualTrifecta).size===3&&!seen.has(key);
  if(!valid){rejected++;continue;}
  seen.add(key);eligible++;if(tickets.includes(actualTrifecta))hits++;
 }
 return {eligibleRaces:eligible,hits,rejectedRecords:rejected,hitRate:eligible?hits/eligible:null,
  targetRate:researchTarget.targetRate,minimumHoldoutRaces:minimumRaces,
  sufficientSample:eligible>=minimumRaces,targetReached:eligible>=minimumRaces&&hits/eligible>=researchTarget.targetRate,
  eligibleForDeployment:false,warning:'Historical holdout hit rate is not a guarantee of future results; check provenance and no-leakage independently.'};
}

// Candidate score computation for six independently verified pre-race input rows.
// All five factors are normalized 0..1 by their respective upstream validators.
// Do not use actual race ST, finish, or post-race statistics as input.
export function scoreVerifiedPreRaceFactors(rows,weights=researchWeightCandidate){
 if(!validateResearchWeights(weights))throw Error('Invalid score weights');
 if(!Array.isArray(rows)||rows.length!==6||new Set(rows.map(r=>r?.boat)).size!==6||
  !rows.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6))return {ready:false,reason:'six_distinct_boats_required'};
 const factors=Object.keys(researchWeightCandidate);
 if(!rows.every(r=>r?.preRaceVerified===true&&factors.every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=1)))
  return {ready:false,reason:'all_verified_pre_race_factors_required'};
 return {ready:true,method:'research_candidate_not_calibrated',rankedScores:rows.map(r=>({
  boat:r.boat,score:factors.reduce((sum,k)=>sum+weights[k]*r[k],0)
 })).sort((a,b)=>b.score-a.score||a.boat-b.boat),eligibleForDeployment:false};
}
