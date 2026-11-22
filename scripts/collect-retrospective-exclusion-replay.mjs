// Retrospective diagnostics only: re-run the CURRENT app scoring on historical race pages.
// Historical endpoints can be revised; these are NOT immutable pre-race predictions.
// Usage: node scripts/collect-retrospective-exclusion-replay.mjs YYYYMMDD [venue] [race]
import fs from 'node:fs';
import {replayExclusionVariants} from './replay-exclusion-variants.mjs';
const [date,venueArg,raceArg]=process.argv.slice(2);
if(!/^20\d{6}$/.test(date||'')||(venueArg&&!/^([1-9]|1\d|2[0-4])$/.test(venueArg))||(raceArg&&!/^([1-9]|1[0-2])$/.test(raceArg)))throw Error('Usage: node scripts/collect-retrospective-exclusion-replay.mjs YYYYMMDD [venue] [race]');
const base='https://boat-score-2-preview.saumh-sau-288.workers.dev';
const venues=venueArg?[Number(venueArg)]:Array.from({length:24},(_,i)=>i+1);
const races=raceArg?[Number(raceArg)]:Array.from({length:12},(_,i)=>i+1);
const requests=[],held=[];
async function json(path){
 const res=await fetch(base+path,{signal:AbortSignal.timeout(35000)});
 return {ok:res.ok,data:await res.json()};
}
for(const venue of venues)for(const race of races){
 const key=date+':'+venue+':'+race;
 const query='?date='+date+'&venue='+venue+'&race='+race;
 try{
  const [p,o]=await Promise.all([json('/api/predict/selected-race'+query),json('/api/official/result'+query)]);
  if(!p.ok||p.data.ready!==true||!Array.isArray(p.data.rankedScores)||p.data.rankedScores.length!==6){
   held.push({key,reason:'current_app_historical_score_unavailable'});continue;
  }
  if(!o.ok||o.data.verified!==true||!Array.isArray(o.data.finishOrder)||o.data.finishOrder.length!==6){
   held.push({key,reason:'official_finish_unverified'});continue;
  }
  // No deadline capture is available for reconstructed history. Do not forge it.
  const row={date,venue,race,scoreSource:'current_app_recomputed_after_race',officialFinish:o.data.finishOrder,
   resultVerified:true,boats:p.data.rankedScores.map(x=>({boat:x.boat,score:x.score})),
   capturedAt:null,deadlineAt:null,incidentFree:null};
  requests.push(row);
 }catch(e){held.push({key,reason:'request_failed',detail:String(e.message||e).slice(0,100)});}
}
const strict=replayExclusionVariants(requests);
const diagnostic=replayExclusionVariants(requests,{mode:'retrospective_diagnostic'});
const out={date,mode:'retrospective_current_app_diagnostic_not_pre_race_validation',
 generatedAt:new Date().toISOString(),requests:requests.length,held,strictEvaluation:strict,retrospectiveDiagnostic:diagnostic,
 evidence:requests,note:'Reconstructed rows intentionally fail strict pre-race checks. Diagnostic comparisons use current app scoring after the race, not immutable historical predictions.'};
const file='retrospective-exclusion-'+date+(venueArg?'-'+venueArg:'')+(raceArg?'-'+raceArg:'')+'.json';
fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({file,requests:requests.length,held:held.length,strictEligible:strict.summary.baseline_no_exclusion.eligible,retrospectiveEligible:diagnostic.summary.baseline_no_exclusion.eligible,reason:'historical reconstruction lacks pre-deadline captured scores'},null,2));
