// Research-only, fail-closed venue selection. Never infer active venues from HTTP 200.
export function selectVerifiedActiveVenues(evidence,{date}={}){
 if(!/^20\d{6}$/.test(String(date||'')))throw new Error('A YYYYMMDD date is required');
 if(!evidence||evidence.safeToFilterByActivity!==true||evidence.date!==date)
  return {venues:[],verified:false,reason:'activity_evidence_unverified_or_date_mismatch'};
 const list=evidence.verifiedActiveVenues;
 if(!Array.isArray(list)||!list.length||list.some(x=>!Number.isInteger(x)||x<1||x>24)||new Set(list).size!==list.length)
  return {venues:[],verified:false,reason:'verified_active_venues_missing_or_invalid'};
 // Independent official-source authentication is required upstream.
 if(evidence.authentication!=='independently_verified_official_schedule')
  return {venues:[],verified:false,reason:'official_schedule_authentication_missing'};
 return {venues:[...list].sort((a,b)=>a-b),verified:true,reason:null};
}
