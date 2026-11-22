// Audit the twelve *slots* of an existing deployed 6+6 response.
// IMPORTANT: These are NOT twelve independently designed prediction methods.
// Never present slot hit rates as independent method performance.
import {validTrifectaPicks,verifiedPodium} from './backtest-comparison-eligibility.mjs';
const key=r=>[r?.date,Number(r?.venue),Number(r?.race)].join('|');
const explicitTime=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const officialUrl=(result,row)=>{try{const u=new URL(result?.sourceUrl);return u.protocol==='https:'&&u.hostname==='www.boatrace.jp'&&u.pathname==='/owpc/pc/race/raceresult'&&u.searchParams.getAll('hd').length===1&&u.searchParams.getAll('jcd').length===1&&u.searchParams.getAll('rno').length===1&&u.searchParams.get('hd')===String(row.date)&&Number(u.searchParams.get('jcd'))===Number(row.venue)&&Number(u.searchParams.get('rno'))===Number(row.race);}catch{return false;}};
const beforeCutoff=(row,result)=>explicitTime(row?.receivedAt)&&explicitTime(result?.officialCutoffAt)&&Date.parse(row.receivedAt)<Date.parse(result.officialCutoffAt);
export function auditDeployedTicketSlots(capture,results){
 if(!Array.isArray(capture?.records)||!Array.isArray(results))throw new TypeError('capture.records and results required');
 const index=new Map(),duplicateResults=new Set();
 for(const r of results){const k=key(r);if(index.has(k)){duplicateResults.add(k);index.set(k,null);}else index.set(k,r);}
 const slots=Object.fromEntries([...Array.from({length:6},(_,i)=>'main-'+(i+1)),...Array.from({length:6},(_,i)=>'upset-'+(i+1))].map(k=>[k,{evaluated:0,hits:0,rate:null}]));
 const summary={compared:0,held:0,mainAny:0,upsetAny:0,anyTwelve:0,holdReasons:{}};
 const counts=new Map();for(const row of capture.records){const k=key(row);counts.set(k,(counts.get(k)||0)+1);}
 const hold=reason=>{summary.held++;summary.holdReasons[reason]=(summary.holdReasons[reason]||0)+1;};
 for(const row of capture.records){
  const k=key(row),result=index.get(k),actual=duplicateResults.has(k)?null:verifiedPodium(result);
  if(counts.get(k)!==1){hold('duplicate_capture');continue;}
  if(capture.authenticatedBeforeRace!==true||row.preRaceVerified!==true||row.savedBeforeCutoff!==true||!beforeCutoff(row,result)){hold('pre_race_unverified');continue;}
  if(!actual||!officialUrl(result,row)){hold('official_result_unverified_or_missing');continue;}
  if(row.response?.ready!==true||!validTrifectaPicks(row.response.main)||!validTrifectaPicks(row.response.upset)){hold('invalid_saved_tickets');continue;}
  summary.compared++;
  let mainHit=false,upsetHit=false;
  for(const [group,picks] of [['main',row.response.main],['upset',row.response.upset]]){
   for(let i=0;i<6;i++){
    const s=slots[group+'-'+(i+1)],hit=picks[i].join('-')===actual;
    s.evaluated++;s.hits+=Number(hit);
    if(hit){if(group==='main')mainHit=true;else upsetHit=true;}
   }
  }
  summary.mainAny+=Number(mainHit);summary.upsetAny+=Number(upsetHit);summary.anyTwelve+=Number(mainHit||upsetHit);
 }
 for(const s of Object.values(slots))s.rate=s.evaluated?s.hits/s.evaluated:null;
 return {slots,summary,coverage:{mainSix:summary.compared?summary.mainAny/summary.compared:null,upsetSix:summary.compared?summary.upsetAny/summary.compared:null,allTwelve:summary.compared?summary.anyTwelve/summary.compared:null},warning:'Existing deployed 56/29/15 ranked ticket SLOTS, not twelve independent methods. Pre-race flags and resultVerified require external authentication.'};
}
