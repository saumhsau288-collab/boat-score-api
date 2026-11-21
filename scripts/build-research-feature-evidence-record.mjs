// Research-only normalized evidence envelope. No claim that these records fed the predictor.
export function buildResearchFeatureEvidenceRecord({race,kind,rows=[],receivedAt,sourceUrl,responseSha256}={}){
 const validRace=/^20\d{6}$/.test(String(race?.date??''))&&Number.isInteger(race?.venue)&&race.venue>=1&&race.venue<=24&&Number.isInteger(race?.race)&&race.race>=1&&race.race<=12;
 const validSource=typeof sourceUrl==='string'&&sourceUrl.startsWith('https://')&&/^[a-f0-9]{64}$/.test(String(responseSha256??''))&&typeof receivedAt==='string'&&Number.isFinite(Date.parse(receivedAt));
 if(!validRace||!validSource||!['averageST','makulabo50'].includes(kind))return {status:'held',reason:'invalid_identity_or_source',rows:[],eligibleForCalibration:false};
 if(!Array.isArray(rows)||rows.length!==6||new Set(rows.map(x=>x.boat)).size!==6||
  rows.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!/^\d{4}$/.test(String(x.racerId)))||
  new Set(rows.map(x=>String(x.racerId))).size!==6)return {status:'held',reason:'invalid_six_racer_mapping',rows:[],eligibleForCalibration:false};
 const normalized=rows.map(x=>{
  const value=kind==='averageST'?Number.isFinite(x.value)&&x.value>=0&&x.value<=1:
   Number.isInteger(x.runs)&&x.runs>=1&&x.runs<=50&&Number.isFinite(x.firstPlaceRate)&&x.firstPlaceRate>=0&&x.firstPlaceRate<=100;
  return {...race,boat:x.boat,racerId:String(x.racerId),receivedAt,sourceUrl,responseSha256,
   verified:x.sourceVerified===true&&value,...(kind==='averageST'?{kind:'pre_race_average_st',value:value?x.value:null}:
   {scope:'same_labelled_frame_recent_up_to_50_all_venues',runs:value?x.runs:null,firstPlaceRate:value?x.firstPlaceRate:null})};
 });
 return {status:normalized.every(x=>x.verified)?'normalized_source_claims':'held_unverified_values',
  kind,date:race.date,venue:race.venue,race:race.race,receivedAt,sourceUrl,responseSha256,rows:normalized,
  originalInputsVerified:false,eligibleForCalibration:false,scoreChangeApplied:false};
}
