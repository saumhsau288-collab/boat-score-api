import fs from 'node:fs';
const date=process.env.BACKTEST_DATE||'20261116';
const selectedVenue=Number(process.env.BACKTEST_VENUE||0);
if(selectedVenue&&(!Number.isInteger(selectedVenue)||selectedVenue<1||selectedVenue>24))throw Error('Invalid venue');
const base=process.env.BOAT_SCORE_URL||'https://boat-score-2-preview.saumh-sau-288.workers.dev';
if(!/^20\d{6}$/.test(date))throw Error('Invalid date');
const get=async(path,timeout=75000)=>{try{const r=await fetch(base+path,{signal:AbortSignal.timeout(timeout)});const j=await r.json();return r.ok?j:{error:'http_'+r.status,...j}}catch(e){return {error:String(e.message||e)}}};
const pool=async(items,limit,fn)=>{let index=0;const results=new Array(items.length);await Promise.all(Array.from({length:limit},async()=>{while(index<items.length){const i=index++;results[i]=await fn(items[i],i)}}));return results};
console.log('Checking venue race-1 entries, not assuming unverified venues are closed.');
const venues=selectedVenue?[]:await pool(Array.from({length:24},(_,i)=>i+1),3,async venue=>{
 const d=await get('/api/official/active-venues?date='+date+'&offset='+(venue-1),35000);
 console.log('venue',venue,d.checks?.[0]?.status||d.error||'unknown');
 return {venue,verified:d.verifiedVenues?.includes(venue)===true,reason:d.checks?.[0]?.reason||d.error||null};
});
const verifiedVenues=selectedVenue?[selectedVenue]:venues.filter(x=>x.verified).map(x=>x.venue);
const targets=verifiedVenues.flatMap(venue=>Array.from({length:12},(_,i)=>({venue,race:i+1})));
console.log('Confirmed race-1 venue candidates:',verifiedVenues,'race targets:',targets.length);
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
const summary={date,method:'existing_deployed_Boat_Score_2_predictor',retrospective:true,notSavedMorningPredictions:true,preRaceAccuracy:null,eligibleForWeightTuning:false,verifiedVenueCandidates:selectedVenue?[]:verifiedVenues,manuallySelectedVenue:selectedVenue||null,unverifiedVenues:venues.filter(x=>!x.verified),checkedRaces:records.length,comparedRaces:compared.length,heldRaces:records.length-compared.length,mainHits,upsetHits,mainHitRate:compared.length?mainHits/compared.length:null,upsetHitRate:compared.length?upsetHits/compared.length:null,notes:['Post-race API requests must not be treated as pre-race predictive accuracy or used to tune weights','Official metrics may not be historical point-in-time snapshots','Makulabo and heatmap are not scored unless already part of existing prediction API','Unverified venues are not necessarily closed'],records};
fs.mkdirSync('backtest-results',{recursive:true});
fs.writeFileSync('backtest-results/'+date+'.json',JSON.stringify(summary,null,2));
fs.writeFileSync('backtest-results/'+date+'.csv',['date,venue,race,status,actual,main,upset,mainHit,upsetHit,predictionReason,resultReason',...records.map(r=>[r.date,r.venue,r.race,r.status,r.actual||'',r.main.join('|'),r.upset.join('|'),r.mainHit??'',r.upsetHit??'',r.predictionReason||'',r.resultReason||''].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(','))].join('\n'));
console.log('SUMMARY',JSON.stringify({...summary,records:undefined}));
