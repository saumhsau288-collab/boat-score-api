// Research-only immutable-format builder; persistence must be implemented separately.
// Unknown factors remain null, never silently zero.
export function buildRacerInputEvidenceSnapshot({date,venue,race,capturedAt,cutoffAt,source,racers}={}){
 const fail=reason=>({ready:false,reason});
 const zone=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
 if(!/^20\d{6}$/.test(String(date??''))||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return fail('invalid_race_identity');
 if(!zone.test(capturedAt??'')||!zone.test(cutoffAt??'')||!Number.isFinite(Date.parse(capturedAt))||!Number.isFinite(Date.parse(cutoffAt))||Date.parse(capturedAt)>=Date.parse(cutoffAt))return fail('invalid_precutoff_timestamps');
 const jstDay=new Date(Date.parse(capturedAt)+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
 const cutoffDay=new Date(Date.parse(cutoffAt)+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
 if(jstDay!==date||cutoffDay!==date)return fail('capture_date_mismatch_jst');
 if(source!=='official_live_entry')return fail('unverified_source');
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(r=>r?.boat)).size!==6||
  new Set(racers.map(r=>r?.racerId)).size!==6||!racers.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&/^\d{4}$/.test(String(r?.racerId??''))))return fail('six_verified_racer_identities_required');
 const bounds={nationalWinRate:[0,10],localWinRate:[0,10],averageST:[0,1],motorSecondPlaceRate:[0,100],expectedEntryCourse:[1,6],exhibitionTime:[0,30],last50Score:[0,100]};
 const fields=['nationalWinRate','localWinRate','averageST','motorSecondPlaceRate','expectedEntryCourse','exhibitionTime','last50Score'];
 const clean=racers.map(r=>{
  const values={},missing=[];
  for(const k of fields){
   const v=r[k];
   if(v===null||v===undefined||v===''){values[k]=null;missing.push(k);}
   else if(typeof v==='number'&&Number.isFinite(v)&&v>=bounds[k][0]&&v<=bounds[k][1]&&(k!=='expectedEntryCourse'||Number.isInteger(v))){values[k]=v;}
   else{values[k]=null;missing.push(k);}
  }
  return {boat:r.boat,racerId:String(r.racerId),values,missing};
 }).sort((a,b)=>a.boat-b.boat);
 return {ready:true,schemaVersion:1,date,venue,race,capturedAt,cutoffAt,source,
  captureStatus:'caller_supplied_unverified',racers:clean,
  scoringReady:clean.every(r=>r.missing.length===0),
  note:'Caller-provided timestamps and source labels are not trusted server evidence. Missing values are null, not zero.'};
}
