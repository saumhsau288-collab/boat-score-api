// Research-only future pre-race evidence gate. A timestamp alone never proves original model use.
export function auditFutureFeatureProvenance({race,official,averageST=[],makulabo=[],prediction,cutoffAt}={}){
 const key=x=>[String(x?.date??'').replaceAll('-',''),Number(x?.venue),Number(x?.race)].join('/');
 const validKey=x=>/^20\d{6}\/(?:[1-9]|1\d|2[0-4])\/(?:[1-9]|1[0-2])$/.test(key(x));
 const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
 const cutoff=time(cutoffAt);
 const validDate=x=>{const d=String(x?.date??'').replaceAll('-','');const t=Date.parse(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00Z`);return /^20\d{6}$/.test(d)&&Number.isFinite(t)&&new Date(t).toISOString().slice(0,10).replaceAll('-','')===d;};
 const held=(reason)=>({status:'held',reason,eligibleForCalibration:false,originalInputsVerified:false,scoreChangeApplied:false});
 if(!validDate(race)||!validKey(race)||!validKey(official)||!validKey(prediction)||key(race)!==key(official)||key(race)!==key(prediction))
  return held('race_identity_mismatch');
 if(!Number.isFinite(cutoff)||!Number.isFinite(time(prediction.receivedAt))||time(prediction.receivedAt)>cutoff)
  return held('prediction_cutoff_unverified');
 const racers=official.racers;
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(x=>x.boat)).size!==6||
    racers.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!/^\d{4}$/.test(String(x.racerId))))
  return held('official_racer_identity_unverified');
 const ids=new Set(racers.map(x=>String(x.racerId)));
 if(ids.size!==6)return held('duplicate_racer_identity');
 const evidence=(items,kind)=>{
  if(!Array.isArray(items)||items.length!==6||new Set(items.map(x=>x.boat)).size!==6)return false;
  return items.every(x=>{
   const racer=racers.find(r=>r.boat===x.boat);
   const captured=time(x.receivedAt);
   const validValue=kind==='averageST'?x.kind==='pre_race_average_st'&&Number.isFinite(x.value)&&x.value>=0&&x.value<=1:
     x.scope==='same_labelled_frame_recent_up_to_50_all_venues'&&Number.isInteger(x.runs)&&x.runs>=1&&x.runs<=50&&
     Number.isFinite(x.firstPlaceRate)&&x.firstPlaceRate>=0&&x.firstPlaceRate<=100;
   return racer&&String(x.racerId)===String(racer.racerId)&&x.verified===true&&
    x.date===race.date&&Number(x.venue)===Number(race.venue)&&Number(x.race)===Number(race.race)&&
    Number.isFinite(captured)&&captured<=cutoff&&captured<=time(prediction.receivedAt)&&typeof x.sourceUrl==='string'&&x.sourceUrl.startsWith('https://')&&
    /^[a-f0-9]{64}$/.test(String(x.responseSha256??''))&&validValue;
  });
 };
 const officialCapture=time(official.receivedAt);
 const staleLimitMs=24*60*60*1000;
 const sameCalendarDayUtc=(stamp,date)=>Number.isFinite(time(stamp))&&new Date(time(stamp)).toISOString().slice(0,10).replaceAll('-','')===date;
 const recentForPrediction=(stamp)=>Number.isFinite(time(stamp))&&time(prediction.receivedAt)-time(stamp)<=staleLimitMs;
 const evidenceFreshnessVerified=averageST.every(x=>sameCalendarDayUtc(x.receivedAt,race.date)&&recentForPrediction(x.receivedAt))&&
  makulabo.every(x=>sameCalendarDayUtc(x.receivedAt,race.date)&&recentForPrediction(x.receivedAt));
 const officialSnapshotBeforePrediction=official.status==='captured_research_inputs'&&
   official.racers.every(x=>x.sourceVerified===true)&&
   Number.isFinite(officialCapture)&&officialCapture<=time(prediction.receivedAt)&&officialCapture<=cutoff&&
   sameCalendarDayUtc(official.receivedAt,race.date)&&recentForPrediction(official.receivedAt)&&
   typeof official.sourceUrl==='string'&&official.sourceUrl.startsWith('https://www.boatrace.jp/')&&
   /^[a-f0-9]{64}$/.test(String(official.responseSha256??''));
 const stVerified=evidence(averageST,'averageST'),makulaboVerified=evidence(makulabo,'makulabo');
 const originalInputsVerified=false; // Requires separate proof these exact records fed the predictor.
 return {status:officialSnapshotBeforePrediction&&evidenceFreshnessVerified&&stVerified&&makulaboVerified?'source_evidence_ready_original_inputs_unverified':'held',
  reason:officialSnapshotBeforePrediction&&stVerified&&makulaboVerified?'original_prediction_inputs_not_authenticated':'feature_evidence_incomplete',
  officialSnapshotBeforePrediction,evidenceFreshnessVerified,
  averageSTVerified:stVerified,makulabo50Verified:makulaboVerified,
  originalInputsVerified,eligibleForCalibration:false,scoreChangeApplied:false};
}
