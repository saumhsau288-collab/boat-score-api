// Strict research-only gate. Records must be independently authenticated.
// A record's ready:true or sourceVerified:true flag is never enough by itself.
export function auditAuthenticatedRaces(records) {
 if(!Array.isArray(records))return {status:'invalid_batch',eligible:[],held:[]};
 const eligible=[],held=[],seen=new Set();
 for(const r of records){
  const key=r?.raceKey,why=[];
  if(typeof key!=='string'||!/^\d{8}-(0[1-9]|1[0-9]|2[0-4])-(?:[1-9]|1[0-2])$/.test(key))why.push('invalid_race_key');
  if(seen.has(key))why.push('duplicate_race_key');
  seen.add(key);
  const p=r?.prediction,e=r?.evidence;
  if(!Number.isSafeInteger(p?.capturedAtEpochMs)||!Number.isSafeInteger(r?.officialCutoffEpochMs)||p.capturedAtEpochMs>=r.officialCutoffEpochMs)why.push('cutoff_or_capture_unverified');
  if(e?.independentCaptureVerified!==true||typeof e?.immutableCaptureRef!=='string'||!e.immutableCaptureRef.trim()||e?.officialCutoffVerified!==true||typeof e?.officialCutoffUrl!=='string'||!/^https:\/\//.test(e.officialCutoffUrl))why.push('independent_capture_provenance_missing');
  const racers=r?.racers;
  if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(x=>x?.boat)).size!==6||new Set(racers.map(x=>String(x?.racerId))).size!==6||racers.some(x=>!Number.isInteger(x?.boat)||x.boat<1||x.boat>6||!/^\d{4}$/.test(String(x?.racerId))||x?.preRaceFeaturesVerified!==true||!Number.isSafeInteger(x?.featuresCapturedAtEpochMs)||x.featuresCapturedAtEpochMs>=r.officialCutoffEpochMs))why.push('six_pre_race_feature_vectors_missing');
  if(!Array.isArray(p?.tickets)||p.tickets.length===0||p.tickets.some(t=>!Array.isArray(t)||t.length!==3||new Set(t).size!==3||t.some(b=>!Number.isInteger(b)||b<1||b>6)))why.push('original_tickets_missing');
  if(typeof p?.predictorCommit!=='string'||!/^[0-9a-f]{40}$/.test(p.predictorCommit))why.push('predictor_version_missing');
  const result=r?.officialResult;
  if(result?.raceKey!==key||result?.verified!==true||typeof result?.officialUrl!=='string'||!/^https:\/\//.test(result.officialUrl)||!Array.isArray(result?.finishOrder)||result.finishOrder.length!==6||new Set(result.finishOrder).size!==6||result.finishOrder.some(x=>!Number.isInteger(x)||x<1||x>6))why.push('official_result_missing_or_mismatch');
  if(why.length)held.push({raceKey:key??null,reasons:why});else eligible.push({raceKey:key});
 }
 return {status:'audited',total:records.length,eligibleCount:eligible.length,heldCount:held.length,eligible,held,accuracyCalculationPermitted:eligible.length>0,scoreChangeApplied:false};
}
