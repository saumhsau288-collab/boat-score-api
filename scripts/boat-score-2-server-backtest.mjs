import { verifiedVenueCandidates } from './verified-venue-candidates.mjs';
import fs from 'node:fs';
const date=process.env.BACKTEST_DATE||'20261116';
const selectedVenue=Number(process.env.BACKTEST_VENUE||0);
if(selectedVenue&&(!Number.isInteger(selectedVenue)||selectedVenue<1||selectedVenue>24))throw Error('Invalid venue');
const base=process.env.BOAT_SCORE_URL||'https://boat-score-2-preview.saumh-sau-288.workers.dev';
if(!/^20\d{6}$/.test(date))throw Error('Invalid date');
const get=async(path,timeout=75000)=>{const started=Date.now();try{const r=await fetch(base+path,{signal:AbortSignal.timeout(timeout)});const j=await r.json();return {...(r.ok?j:{error:'http_'+r.status,...j}),_probe:{source:'http_response',status:r.status,elapsedMs:Date.now()-started}}}catch(e){return {error:String(e.message||e),_probe:{source:'client_exception',kind:e.name==='TimeoutError'?'client_timeout':'client_error',elapsedMs:Date.now()-started}}}};
const pool=async(items,limit,fn)=>{let index=0;const results=new Array(items.length);await Promise.all(Array.from({length:limit},async()=>{while(index<items.length){const i=index++;results[i]=await fn(items[i],i)}}));return results};
console.log('Checking venue race-1 entries, not assuming unverified venues are closed.');
const venues=await pool(selectedVenue?[selectedVenue]:Array.from({length:24},(_,i)=>i+1),2,async venue=>{
 const started=Date.now();
 const d=await get('/api/official/active-venues?date='+date+'&offset='+(venue-1),35000);
 const elapsedMs=Date.now()-started;
 const reason=d.checks?.[0]?.reason||d.error||null;
 const verified=d.verifiedVenues?.includes(venue)===true;
 const errorKind=verified?'none':/timeout|timed out|aborted/i.test(String(reason))?'timeout':/^http_\d{3}$/.test(String(reason))?'http_error':'unverified_other';
 console.log('VENUE_CHECK',JSON.stringify({venue,verified,elapsedMs,errorKind,source:d._probe?.source||'unknown',httpStatus:d._probe?.status||null,clientErrorKind:d._probe?.kind||null,reason:typeof reason==='string'?reason.slice(0,120):null}));
 return {venue,verified,reason,errorKind,elapsedMs,source:d._probe?.source||'unknown',httpStatus:d._probe?.status??null,clientErrorKind:d._probe?.kind||null};
});
console.log('VENUE_CHECK_SUMMARY',JSON.stringify(venues.reduce((counts,item)=>{counts[item.errorKind]=(counts[item.errorKind]||0)+1;return counts},{})));
console.log('VENUE_ORIGIN_SUMMARY',JSON.stringify(venues.reduce((counts,item)=>{const key=item.source==='http_response'?'api_http_'+String(item.httpStatus??'unknown'):item.source==='client_exception'?'client_'+String(item.clientErrorKind||'unknown'):'unknown';counts[key]=(counts[key]||0)+1;return counts},{})));
console.log('VENUE_TIMEOUT_TIMING',JSON.stringify(venues.filter(item=>item.errorKind==='timeout').reduce((acc,item)=>{const bucket=item.elapsedMs<10000?'under_10s':item.elapsedMs<35000?'10_to_35s':'35s_or_more';acc[bucket]=(acc[bucket]||0)+1;return acc},{})));
// An HTTP response can report an upstream official timeout even when the client request succeeded.
console.log('VENUE_TIMEOUT_ORIGIN',JSON.stringify(venues.filter(item=>item.errorKind==='timeout').reduce((acc,item)=>{const key=item.source==='http_response'?'api_reported_timeout_http_'+String(item.httpStatus??'unknown'):item.source==='client_exception'?'client_'+String(item.clientErrorKind||'unknown'):'unknown';acc[key]=(acc[key]||0)+1;return acc},{})));
// A selected venue can be rechecked via the deployed non-fast official verifier.
// This avoids confusing the 4.5s+4.5s fast-verification budget with a site outage.
// Never override the original verification result unless the slower endpoint verifies it.
if(selectedVenue && venues.length===1 && !venues[0].verified && venues[0].errorKind==='timeout'){
 const started=Date.now();
 const slower=await get('/api/official/verify-one-venue?date='+date+'&venue='+selectedVenue,40000);
 const verified=slower.verified===true;
 console.log('SLOW_VERIFICATION_CHECK',JSON.stringify({venue:selectedVenue,verified,elapsedMs:Date.now()-started,source:slower._probe?.source||'unknown',httpStatus:slower._probe?.status??null,reason:verified?null:String(slower.reason||slower.error||'unverified').slice(0,120)}));
 if(verified){venues[0]={...venues[0],verified:true,reason:null,errorKind:'none',verificationMethod:'slow_official_endpoint'};}
}
const verifiedVenues=verifiedVenueCandidates(venues);
const targets=verifiedVenues.flatMap(venue=>Array.from({length:12},(_,i)=>({venue,race:i+1})));
console.log('Officially verified venue candidates:',verifiedVenues,'race targets:',targets.length);
if (targets.length === 0) {
  console.error('BACKTEST_BLOCKED: No venue was verified. This is an official-data verification failure, not a successful zero-race comparison.');
  console.error('Unverified venue reasons:', JSON.stringify(venues));
  process.exitCode = 1;
}

const records=await pool(targets,3,async({venue,race},i)=>{
 const query='?'+new URLSearchParams({date,venue,race});
 // The deployed Boat Score 2 predictor, NOT a duplicate model.
 const [prediction,result]=await Promise.all([get('/api/predict/selected-race'+query+'&mode=beforeinfo'),get('/api/official/result'+query,25000)]);
 const actual=result.verified===true&&Array.isArray(result.finishOrder)&&result.finishOrder.length===6?result.finishOrder.slice(0,3).join('-'):null;
 const valid=arr=>Array.isArray(arr)&&arr.length===6&&arr.every(x=>Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6));
 const ready=prediction.ready===true&&valid(prediction.main)&&valid(prediction.upset)&&actual!==null;
 const main=valid(prediction.main)?prediction.main.map(x=>x.join('-')):[];
 const upset=valid(prediction.upset)?prediction.upset.map(x=>x.join('-')):[];
 const record={date,venue,race,status:ready?'compared':'held',actual,main,upset,mainHit:ready?main.includes(actual):null,upsetHit:ready?upset.includes(actual):null,predictionReason:prediction.reason||prediction.error||null,resultReason:result.reason||result.error||null,missingInputs:prediction.missingInputs||[],predictionMode:'existing_Boat_Score_2_selected_race'};
 console.log((i+1)+'/'+targets.length,venue+'-'+race,record.status,actual||'-',ready?('main='+record.mainHit+' upset='+record.upsetHit):'', 'predictionReason='+JSON.stringify(record.predictionReason), 'resultReason='+JSON.stringify(record.resultReason), 'missingInputs='+JSON.stringify(record.missingInputs), 'predictionReady='+JSON.stringify(prediction.ready), 'predictionKeys='+JSON.stringify(Object.keys(prediction)), 'resultKeys='+JSON.stringify(Object.keys(result)));
 return record;
});
const compared=records.filter(x=>x.status==='compared');
const mainHits=compared.filter(x=>x.mainHit).length,upsetHits=compared.filter(x=>x.upsetHit).length;
const summary={date,method:'existing_deployed_Boat_Score_2_predictor',retrospective:true,notSavedMorningPredictions:true,verifiedVenueCandidates:verifiedVenues,manuallySelectedVenue:selectedVenue||null,unverifiedVenues:venues.filter(x=>!x.verified),checkedRaces:records.length,comparedRaces:compared.length,heldRaces:records.length-compared.length,mainHits,upsetHits,mainHitRate:compared.length?mainHits/compared.length:null,upsetHitRate:compared.length?upsetHits/compared.length:null,notes:['Official metrics may not be historical point-in-time snapshots','Makulabo and heatmap are not scored unless already part of existing prediction API','Unverified venues are not necessarily closed'],records};
fs.mkdirSync('backtest-results',{recursive:true});
fs.writeFileSync('backtest-results/'+date+'.json',JSON.stringify(summary,null,2));
fs.writeFileSync('backtest-results/'+date+'.csv',['date,venue,race,status,actual,main,upset,mainHit,upsetHit,predictionReason,resultReason',...records.map(r=>[r.date,r.venue,r.race,r.status,r.actual||'',r.main.join('|'),r.upset.join('|'),r.mainHit??'',r.upsetHit??'',r.predictionReason||'',r.resultReason||''].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(','))].join('\n'));
console.log('SUMMARY',JSON.stringify({...summary,records:undefined}));
if (compared.length === 0) {
  console.error('BACKTEST_INCOMPLETE: No races were compared; inspect prediction/result reasons in the uploaded report.');
  process.exitCode = 1;
}

