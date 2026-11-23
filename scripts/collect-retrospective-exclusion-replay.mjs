// Retrospective diagnostics only: re-run the CURRENT app scoring on historical race pages.
// Historical endpoints can be revised; these are NOT immutable pre-race predictions.
// Usage: node scripts/collect-retrospective-exclusion-replay.mjs YYYYMMDD [venue|venue,venue] [race]
import fs from 'node:fs';
import {replayExclusionVariants} from './replay-exclusion-variants.mjs';
const [date,venueArg,raceArg]=process.argv.slice(2);
if(!/^20\d{6}$/.test(date||'')||(venueArg&&!/^([1-9]|1\d|2[0-4])(,([1-9]|1\d|2[0-4]))*$/.test(venueArg))||(raceArg&&!/^([1-9]|1[0-2])$/.test(raceArg)))throw Error('Usage: node scripts/collect-retrospective-exclusion-replay.mjs YYYYMMDD [venue|venue,venue] [race]');
const base='https://boat-score-2-preview.saumh-sau-288.workers.dev';
const venues=venueArg?[...new Set(venueArg.split(',').map(Number))]:Array.from({length:24},(_,i)=>i+1);
const races=raceArg?[Number(raceArg)]:Array.from({length:12},(_,i)=>i+1);
const requests=[],held=[];
async function json(path){
 const res=await fetch(base+path,{signal:AbortSignal.timeout(35000)});
 return {ok:res.ok,data:await res.json()};
}
// Bounded concurrency reduces wall-clock time without flooding the preview API.
// Every race still gets the same two endpoints, and failed races remain held.
const tasks=venues.flatMap(venue=>races.map(race=>({venue,race})));
// Configurable for benchmarking; cap at 12 to limit load on the preview service.
const requestedConcurrency=Number(process.env.REPLAY_CONCURRENCY||10);
if(!Number.isInteger(requestedConcurrency)||requestedConcurrency<1||requestedConcurrency>12)throw Error('REPLAY_CONCURRENCY must be an integer from 1 to 12');
const CONCURRENCY=requestedConcurrency;
let cursor=0;
const collected=new Array(tasks.length);
async function worker(){
 while(true){
  const index=cursor++;
  if(index>=tasks.length)return;
  const {venue,race}=tasks[index];
  const key=date+':'+venue+':'+race;
  const query='?date='+date+'&venue='+venue+'&race='+race;
  try{
   const [p,o]=await Promise.all([json('/api/predict/selected-race'+query),json('/api/official/result'+query)]);
   if(!p.ok||p.data.ready!==true||!Array.isArray(p.data.rankedScores)||p.data.rankedScores.length!==6){
    collected[index]={held:{key,reason:'current_app_historical_score_unavailable'}};continue;
   }
   if(!o.ok||o.data.verified!==true||!Array.isArray(o.data.finishOrder)||o.data.finishOrder.length!==6){
    collected[index]={held:{key,reason:'official_finish_unverified'}};continue;
   }
   collected[index]={row:{date,venue,race,scoreSource:'current_app_recomputed_after_race',
    officialFinish:o.data.finishOrder,resultVerified:true,
    boats:p.data.rankedScores.map(x=>({boat:x.boat,score:x.score})),
    capturedAt:null,deadlineAt:null,incidentFree:null}};
  }catch(e){
   collected[index]={held:{key,reason:'request_failed',detail:String(e.message||e).slice(0,100)}};
  }
 }
}
const started=Date.now();
await Promise.all(Array.from({length:Math.min(CONCURRENCY,tasks.length)},()=>worker()));
for(const item of collected){
 if(item.row)requests.push(item.row);
 else held.push(item.held);
}
const fetchElapsedSeconds=Math.round((Date.now()-started)/1000);
console.log(JSON.stringify({fetchTasks:tasks.length,concurrency:CONCURRENCY,fetchElapsedSeconds,requests:requests.length,held:held.length}));

const strict=replayExclusionVariants(requests);
const diagnostic=replayExclusionVariants(requests,{mode:'retrospective_diagnostic'});
const venueSummaries=Object.fromEntries(venues.map(venue=>{const subset=requests.filter(x=>x.venue===venue);const x=replayExclusionVariants(subset,{mode:'retrospective_diagnostic'});return [venue,{races:subset.length,summary:x.summary}]}));
const out={date,venues,venueSummaries,mode:'retrospective_current_app_diagnostic_not_pre_race_validation',
 generatedAt:new Date().toISOString(),requests:requests.length,held,strictEvaluation:strict,retrospectiveDiagnostic:diagnostic,
 evidence:requests,note:'Reconstructed rows intentionally fail strict pre-race checks. Diagnostic comparisons use current app scoring after the race, not immutable historical predictions.'};
const file='retrospective-exclusion-'+date+(venueArg?'-'+venueArg.replaceAll(',','_'):'')+(raceArg?'-'+raceArg:'')+'.json';
fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({file,requests:requests.length,held:held.length,strictEligible:strict.summary.baseline_no_exclusion.eligible,retrospectiveEligible:diagnostic.summary.baseline_no_exclusion.eligible,reason:'historical reconstruction lacks pre-deadline captured scores'},null,2));
