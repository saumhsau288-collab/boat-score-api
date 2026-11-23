// Research-only per-slot comparison. Requires already authenticated pre-race captures and independently verified official results.
import {validTrifectaPicks,verifiedPodium} from './backtest-comparison-eligibility.mjs';
const raceKey=r=>/^20\d{6}$/.test(String(r?.date??''))&&Number.isInteger(Number(r?.venue))&&Number(r.venue)>=1&&Number(r.venue)<=24&&Number.isInteger(Number(r?.race))&&Number(r.race)>=1&&Number(r.race)<=12?[String(r.date),Number(r.venue),Number(r.race)].join(':'):null;
const timezoneStamp=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const validOfficialUrl=(url,record)=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='www.boatrace.jp'&&u.pathname==='/owpc/pc/race/raceresult'&&u.searchParams.get('hd')===String(record.date)&&Number(u.searchParams.get('jcd'))===Number(record.venue)&&Number(u.searchParams.get('rno'))===Number(record.race);}catch{return false;}};
export function compareTwelveMethods(capture,results){
 const methods=Array.from({length:12},(_,i)=>({method:i<6?'main':'upset',slot:i%6+1,compared:0,hits:0,hitRate:null}));
 const holdReasons={};let held=0,compared=0;
 const officialByKey=new Map();
 for(const result of Array.isArray(results)?results:[]){
  const key=raceKey(result);if(!key)continue;
  if(officialByKey.has(key))officialByKey.set(key,null);else officialByKey.set(key,result);
 }
 for(const record of Array.isArray(capture?.records)?capture.records:[]){
  const prediction=record?.response,official=officialByKey.get(raceKey(record));
  const reasons=[];
  if(capture?.authenticatedBeforeRace!==true||record?.independentlyAuthenticatedCapture!==true)reasons.push('pre_race_capture_not_authenticated');
  if(record?.officialCutoffVerified!==true)reasons.push('cutoff_not_verified');
  if(record?.officialResultVerified!==true)reasons.push('official_result_not_independently_verified');
  if(!validTrifectaPicks(prediction?.main)||!validTrifectaPicks(prediction?.upset))reasons.push('invalid_twelve_picks');
  const actual=verifiedPodium(official);
  if(!actual)reasons.push('missing_verified_six_boat_result');
  if(!validOfficialUrl(official?.sourceUrl,record))reasons.push('official_result_source_unverified');
  if(!timezoneStamp(record?.receivedAt)||!timezoneStamp(official?.officialCutoffAt))reasons.push('timezone_not_explicit');
  const captured=Date.parse(record?.receivedAt??''),cutoff=Date.parse(official?.officialCutoffAt??'');
  if(!Number.isFinite(captured)||!Number.isFinite(cutoff)||captured>=cutoff)reasons.push('capture_not_before_cutoff');
  if(!raceKey(record)||raceKey(record)!==raceKey(official))reasons.push('race_mismatch');
  if(reasons.length){held++;for(const reason of reasons)holdReasons[reason]=(holdReasons[reason]??0)+1;continue;}
  compared++;
  for(let i=0;i<12;i++){
   const pick=i<6?prediction.main[i]:prediction.upset[i-6];
   methods[i].compared++;if(pick.join('-')===actual)methods[i].hits++;
  }
 }
 for(const method of methods)method.hitRate=method.compared?method.hits/method.compared:null;
 return {compared,held,holdReasons,methods,warning:'Caller verification flags are not independent proof. Audit provenance before using hit rates.'};
}
