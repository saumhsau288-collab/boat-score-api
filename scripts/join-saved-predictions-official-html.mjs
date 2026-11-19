// Research only: archived ticket containment against parsed official-result HTML.
// Not an authenticated pre-race backtest; never feed into scoring calibration.
import fs from 'node:fs';
import {validTrifectaPicks} from './backtest-comparison-eligibility.mjs';
function raceKey(r) {
 const d=String(r?.date??''),v=Number(r?.venue),n=Number(r?.race);
 return /^\d{8}$/.test(d)&&Number.isInteger(v)&&v>=1&&v<=24&&Number.isInteger(n)&&n>=1&&n<=12
  ? [d,v,n].join(':'):null;
}
function tickets(x){return validTrifectaPicks(x)?x.map(p=>p.join('-')):null;}
export function joinSavedPredictionsToParsedOfficialHtml(capture,parsed){
 if(!Array.isArray(capture?.records))throw Error('Expected capture.records');
 if(!Array.isArray(parsed?.rows))throw Error('Expected parsed.rows');
 const indexed=new Map(),counts=new Map();
 for(const r of parsed.rows){const k=raceKey(r);if(k!==null)indexed.set(k,indexed.has(k)?null:r);}
 for(const r of capture.records){const k=raceKey(r);if(k!==null)counts.set(k,(counts.get(k)||0)+1);}
 const rows=[];
 for(const r of capture.records){
  const k=raceKey(r),actual=indexed.get(k);
  if(!actual)continue;
  const m=tickets(r.response?.main),u=tickets(r.response?.upset);
  const p=actual.status==='parsed_needs_independent_review'&&Array.isArray(actual.podium)&&
   actual.podium.length===3&&new Set(actual.podium).size===3&&
   actual.podium.every(n=>Number.isInteger(n)&&n>=1&&n<=6)?actual.podium.join('-'):null;
  const holdReasons=[];
  if(counts.get(k)!==1)holdReasons.push('duplicate_prediction_race');
  if(!p)holdReasons.push('official_podium_not_parsed');
  if(capture.authenticatedBeforeRace!==true)holdReasons.push('pre_race_capture_not_authenticated');
  if(r.response?.ready!==true||r.httpStatus!==200)holdReasons.push('prediction_not_ready');
  if(!m||!u)holdReasons.push('ticket_sets_invalid_or_missing');
  if(actual.resultVerified!==true)holdReasons.push('official_result_independent_verification_missing');
  if(actual.officialCutoffVerified!==true)holdReasons.push('official_cutoff_independent_verification_missing');
  // Even if claimed verification flags are true, no authenticated cutoff evidence is supplied.
  holdReasons.push('capture_before_cutoff_not_independently_authenticated');
  rows.push({date:r.date,venue:r.venue,race:r.race,parsedPodium:p,
   mainTickets:m,upsetTickets:u,
   retrospectiveMainContainsPodium:p&&m?m.includes(p):null,
   retrospectiveUpsetContainsPodium:p&&u?u.includes(p):null,
   status:'research_only_held',holdReasons,authenticatedHit:null,eligibleForAccuracy:false});
 }
 return {method:'saved_tickets_vs_parsed_official_html_research_only',linked:rows.length,
  eligibleForAccuracy:0,mainHitRate:null,upsetHitRate:null,rows,
  warning:'Ticket containment after a race is NOT authenticated pre-race accuracy. Do not tune scoring weights from this report.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [savedFile,parsedFile]=process.argv.slice(2);
 if(!savedFile||!parsedFile)throw Error('Usage: node scripts/join-saved-predictions-official-html.mjs <capture.json> <parsed.json>');
 console.log(JSON.stringify(joinSavedPredictionsToParsedOfficialHtml(
  JSON.parse(fs.readFileSync(savedFile,'utf8')),JSON.parse(fs.readFileSync(parsedFile,'utf8'))),null,2));
}
