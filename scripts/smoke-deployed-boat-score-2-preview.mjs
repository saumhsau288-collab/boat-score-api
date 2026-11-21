#!/usr/bin/env node
// Read-only live preview smoke check; does not deploy or assert prediction correctness.
const base=process.env.BOAT_SCORE_PREVIEW_URL||'https://boat-score-2-preview.saumh-sau-288.workers.dev';
if(new URL(base).protocol!=='https:')throw Error('HTTPS preview required');
const date=process.env.SMOKE_DATE||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const checks=[['version','/api/version'],['mobile_html','/'],['selected_race','/api/predict/selected-race?'+new URLSearchParams({date,venue:'21',race:'1',mode:'beforeinfo'})]];
const results=[];
for(const [name,path] of checks){
 const requestedAt=new Date().toISOString();
 try{
  const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(name==='selected_race'?25000:10000),headers:{Accept:name==='mobile_html'?'text/html':'application/json'}});
  const body=await response.text();
  let parsed=null;try{parsed=JSON.parse(body);}catch{}
  results.push({name,requestedAt,httpStatus:response.status,contentType:response.headers.get('content-type'),
   checkPassed:name==='mobile_html'?response.ok&&/<html\b/i.test(body)&&/Boat Score 2/.test(body):
    name==='version'?response.ok&&parsed?.app==='Boat Score 2 preview':
    response.ok&&parsed!==null&&typeof parsed==='object',
   predictionReady:name==='selected_race'?parsed?.ready===true:null,
   predictionReason:name==='selected_race'?String(parsed?.reason??parsed?.error??'').slice(0,150):null});
 }catch(error){results.push({name,requestedAt,checkPassed:false,error:String(error?.message||error).slice(0,150)});}
}
const pass=results.every(x=>x.checkPassed);
console.log(JSON.stringify({date,base,pass,results,note:'Endpoint availability is not proof of valid six-racer inputs, official schedule, or Android UI behavior.'},null,2));
if(!pass)process.exitCode=1;
