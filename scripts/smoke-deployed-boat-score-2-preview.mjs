#!/usr/bin/env node
// Read-only live preview smoke check; does not deploy or assert prediction correctness.
const base=process.env.BOAT_SCORE_PREVIEW_URL||'https://boat-score-2-preview.saumh-sau-288.workers.dev';
if(new URL(base).protocol!=='https:')throw Error('HTTPS preview required');
const date=process.env.SMOKE_DATE||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const venue=process.env.SMOKE_VENUE||'21';
const race=process.env.SMOKE_RACE||'1';
if(!/^(?:[1-9]|1[0-9]|2[0-4])$/.test(venue)||!/^(?:[1-9]|1[0-2])$/.test(race))throw Error('Invalid smoke venue or race');
const requireReady=process.env.SMOKE_REQUIRE_READY==='true';
const checks=[['version','/api/version'],['mobile_html','/'],['selected_race','/api/predict/selected-race?'+new URLSearchParams({date,venue,race,mode:'beforeinfo'})]];
const results=[];
for(const [name,path] of checks){
 const requestedAt=new Date().toISOString();
 try{
  const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(name==='selected_race'?65000:10000),headers:{Accept:name==='mobile_html'?'text/html':'application/json'}});
  const body=await response.text();
  let parsed=null;try{parsed=JSON.parse(body);}catch{}
  results.push({name,requestedAt,httpStatus:response.status,contentType:response.headers.get('content-type'),
   checkPassed:name==='mobile_html'?response.ok&&/<html\b/i.test(body)&&/Boat Score 2/.test(body):
    name==='version'?response.ok&&parsed?.app==='Boat Score 2 preview':
    response.ok&&parsed!==null&&typeof parsed==='object',
   predictionReady:name==='selected_race'?parsed?.ready===true:null,
   ticketShapeValid:name==='selected_race'&&parsed?.ready===true?['main','upset'].every(key=>Array.isArray(parsed[key])&&parsed[key].length===6&&parsed[key].every(ticket=>Array.isArray(ticket)&&ticket.length===3&&new Set(ticket).size===3&&ticket.every(n=>Number.isInteger(n)&&n>=1&&n<=6))):null,
   predictionReason:name==='selected_race'?String(parsed?.reason??parsed?.error??'').slice(0,150):null,
   officialStatsRetry:name==='selected_race'?parsed?.officialStatsRetry??null:null,
   missingInputs:name==='selected_race'&&Array.isArray(parsed?.missingInputs)?parsed.missingInputs.slice(0,12):null});
 }catch(error){results.push({name,requestedAt,checkPassed:false,error:String(error?.message||error).slice(0,150)});}
}
const pass=results.every(x=>x.checkPassed&& (x.name!=='selected_race'||((!requireReady||x.predictionReady===true)&&(x.predictionReady!==true||x.ticketShapeValid===true))));
console.log(JSON.stringify({date,venue,race,base,requireReady,pass,results,note:'Endpoint availability is not proof of valid six-racer inputs, official schedule, or Android UI behavior.'},null,2));
if(!pass)process.exitCode=1;
