// Research-only temporal gate for the proposed six extra picks.
// All prior-race outcomes and weather observations must precede the weather forecast.
export function auditExtraSixCutoffEvidence(records){
 if(!Array.isArray(records))throw Error('records_must_be_array');
 const accepted=[],excluded={};const reject=k=>excluded[k]=(excluded[k]??0)+1;
 for(const r of records){
  const day=String(r?.date??''),venue=String(r?.venue??'').padStart(2,'0');
  const parse=t=>typeof t==='string'?Date.parse(t):NaN;
  const cutoff=parse(r?.cutoffAt),predicted=parse(r?.weatherPredictedAt),
   weather=parse(r?.weatherObservedAt),lastResult=parse(r?.lastPriorRaceResultAt),
   base=parse(r?.basePredictedAt);
  const targetDay=/^\d{8}$/.test(day)?day.slice(0,4)+'-'+day.slice(4,6)+'-'+day.slice(6):null;
  const sameDay=t=>Number.isFinite(t)&&new Date(t+9*3600000).toISOString().slice(0,10)===targetDay;
  if(!targetDay||!sameDay(cutoff)||!sameDay(predicted)||!sameDay(weather)||!sameDay(base)||
   !Number.isFinite(lastResult)||lastResult>=predicted||weather>predicted||
   predicted>=cutoff||base>=cutoff||base>predicted||
   r?.weatherEvidenceVerified!==true||r?.priorRacesOnlyVerified!==true||
   !Number.isInteger(r?.race)||r.race<2||r.race>12||
   !/^(0[1-9]|1\d|2[0-4])$/.test(venue)){
   reject('invalid_or_future_information');continue;
  }
  if(!Array.isArray(r?.priorRaceNumbers)||r.priorRaceNumbers.length===0||
   new Set(r.priorRaceNumbers).size!==r.priorRaceNumbers.length||
   r.priorRaceNumbers.some(n=>!Number.isInteger(n)||n<1||n>=r.race)){
   reject('invalid_prior_races');continue;
  }
  accepted.push(r);
 }
 return {status:'research_extra_six_cutoff_audit',accepted,excluded,eligibleForDeployment:false,
  warning:'Timestamp and identity gates do not independently authenticate sources. Weather causation and holdout lift remain unproven.'};
}
