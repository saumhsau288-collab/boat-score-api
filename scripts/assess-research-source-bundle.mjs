// Research-only multi-source gate. Never substitute actual ST for average ST.
import {assessPreRaceEvidence} from './assess-pre-race-evidence.mjs';
const SOURCES=['official','averageST','exhibition','entry','weather','makulabo'];
export function assessResearchSourceBundle({sources,deadlineAt}={}){
 const checks={};
 for(const key of SOURCES){
  const item=sources?.[key];
  if(!item){checks[key]={eligible:false,reason:'source_missing'};continue;}
  if(key==='official'){
   checks[key]=assessPreRaceEvidence({snapshot:item.snapshot,deadlineAt,
     independentlyAuthenticated:item.independentlyAuthenticated===true});
   continue;
  }
  const at=Date.parse(item.capturedAt??'');
  const deadline=Date.parse(deadlineAt??'');
  let reason='source_verified';
  if(!Number.isFinite(at)||!Number.isFinite(deadline))reason='timestamps_missing';
  else if(at>=deadline)reason='source_not_before_deadline';
  else if(item.independentlyAuthenticated!==true)reason='independent_authentication_missing';
  else if(item.verified!==true)reason='source_not_verified';
  else if(key==='averageST'&&item.kind!=='pre_race_average_st')reason='actual_st_not_acceptable';
  else if(key==='makulabo'&&(item.identityVerified!==true||item.sampleVerified!==true))reason='makulabo_identity_or_sample_unverified';
  checks[key]={eligible:reason==='source_verified',reason};
 }
 return {eligible:SOURCES.every(k=>checks[k].eligible),checks,scoreChangeApplied:false};
}
