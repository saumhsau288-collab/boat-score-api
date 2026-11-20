// Research-only deadline window gate. No scheduler, network calls or production writes.
const time=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(x)?Date.parse(x):NaN;
export function classifyDeadlineRefresh({now,cutoff,windowMinutes=2}={}){
 const current=time(now),deadline=time(cutoff?.cutoffAt);
 if(!Number.isFinite(current))return {status:'invalid_now',eligible:false};
 if(!cutoff||cutoff.verified!==true||cutoff.source!=='official'||!/^https:\/\/(?:[a-z0-9-]+\.)*boatrace\.jp(?:\/|$)/i.test(cutoff.sourceUrl||'')||!Number.isFinite(deadline))
  return {status:'official_cutoff_unverified',eligible:false};
 if(!/^20\d{6}$/.test(String(cutoff.date))||!Number.isInteger(cutoff.venue)||cutoff.venue<1||cutoff.venue>24||!Number.isInteger(cutoff.race)||cutoff.race<1||cutoff.race>12)
  return {status:'invalid_race_identity',eligible:false};
 if(!Number.isInteger(windowMinutes)||windowMinutes<0||windowMinutes>5)return {status:'invalid_window',eligible:false};
 const target=deadline-10*60_000;
 if(current<target)return {status:'too_early',eligible:false,targetAt:new Date(target).toISOString()};
 if(current>target+windowMinutes*60_000)return {status:'window_passed',eligible:false,targetAt:new Date(target).toISOString()};
 return {status:'eligible_for_read_only_probe',eligible:true,targetAt:new Date(target).toISOString(),warning:'Eligibility does not prove beforeinfo availability or authorized automated deployment.'};
}
