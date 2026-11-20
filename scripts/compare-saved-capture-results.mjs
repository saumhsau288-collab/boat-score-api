// Offline only: compare SAVED predictions with independently verified official results.
// Never request a historical prediction after a race and call it a pre-race forecast.
import {validTrifectaPicks,verifiedPodium} from './backtest-comparison-eligibility.mjs';
function isOfficialBoatraceSource(url) {
 try {
  const parsed=new URL(url);
  return parsed.protocol==='https:' && (parsed.hostname==='boatrace.jp' || parsed.hostname.endsWith('.boatrace.jp')) && !parsed.username && !parsed.password;
 } catch { return false; }
}
function explicitTimezoneTimestamp(value) {
 if(typeof value!=='string'||!/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return NaN;
 return Date.parse(value);
}
function raceKey(row) {
 const date=String(row?.date??'');
 const venue=Number(row?.venue), race=Number(row?.race);
 const y=Number(date.slice(0,4)),m=Number(date.slice(4,6)),d=Number(date.slice(6,8));
 const validDate=/^20\d{6}$/.test(date)&&m>=1&&m<=12&&d>=1&&d<=31&&
  new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===
   date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8);
 if(!validDate || !Number.isInteger(venue) || venue<1 || venue>24 ||
    !Number.isInteger(race) || race<1 || race>12) return null;
 return [date,venue,race].join(':');
}
export function compareSavedCaptureWithVerifiedResults(capture,officialResults){
 const out={method:'saved_predictions_vs_independent_verified_results',compared:0,held:0,
  mainHits:0,upsetHits:0,holdReasons:{},rows:[],mainHitRate:null,upsetHitRate:null,
  note:'A comparison is only eligible with independent verified results and independently authenticated pre-race capture and documented capture-before-cutoff evidence. Historical retrospective API calls are not substitutes.'};
 const byKey=new Map();
 for(const r of Array.isArray(officialResults)?officialResults:[]){
  const key=raceKey(r);
  if(key===null)continue;
  if(!byKey.has(key))byKey.set(key,r);else byKey.set(key,null);
 }
 const records=Array.isArray(capture?.records)?capture.records:[];
 const captureKeyCounts=new Map();
 for(const r of records){const key=raceKey(r);
  if(key===null)continue;captureKeyCounts.set(key,(captureKeyCounts.get(key)||0)+1);}
 for(const r of records){
  const key=raceKey(r);
  const official=byKey.get(key),actual=verifiedPodium(official);
  const reasons=[];
  if(key===null)reasons.push('invalid_saved_capture_race_key');
  if(key!==null && captureKeyCounts.get(key)>1)reasons.push('duplicate_saved_capture_race');
  if(capture?.authenticatedBeforeRace!==true)reasons.push('capture_not_authenticated_before_race');
  if(r.response?.ready!==true||r.httpStatus!==200)reasons.push('prediction_not_ready');
  if(!validTrifectaPicks(r.response?.main)||!validTrifectaPicks(r.response?.upset))reasons.push('invalid_picks');
  if(!actual)reasons.push('no_independently_verified_result');
  if(!isOfficialBoatraceSource(official?.sourceUrl))
   reasons.push('missing_official_result_source');
  else {
   const url=new URL(official.sourceUrl);
   // Require the official result page to identify the same race as the saved prediction.
   if(url.pathname!=='/owpc/pc/race/raceresult'||
      url.searchParams.get('hd')!==String(r.date)||
      Number(url.searchParams.get('jcd'))!==Number(r.venue)||
      Number(url.searchParams.get('rno'))!==Number(r.race))
    reasons.push('official_result_url_race_mismatch');
  }
  const cutoff=explicitTimezoneTimestamp(official?.officialCutoffAt);
  const captured=explicitTimezoneTimestamp(r.receivedAt);
  if(!Number.isFinite(cutoff)||!Number.isFinite(captured)||captured>=cutoff)
   reasons.push('capture_before_official_cutoff_unverified');
  const row={date:r.date,venue:r.venue,race:r.race,status:reasons.length?'held':'compared',reasons,actual:actual||null,mainHit:null,upsetHit:null};
  if(reasons.length){out.held++;for(const reason of reasons)out.holdReasons[reason]=(out.holdReasons[reason]||0)+1;}
  else{
   out.compared++;
   row.mainHit=r.response.main.some(p=>p.join('-')===actual);
   row.upsetHit=r.response.upset.some(p=>p.join('-')===actual);
   if(row.mainHit)out.mainHits++;
   if(row.upsetHit)out.upsetHits++;
  }
  out.rows.push(row);
 }
 if(out.compared){out.mainHitRate=out.mainHits/out.compared;out.upsetHitRate=out.upsetHits/out.compared;}
 return out;
}
