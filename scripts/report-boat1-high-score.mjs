// Historical diagnostic: ONLY races where boat 1 is the highest-scored racer.
// Scores are recomputed after racing, not saved pre-race forecasts.
// Usage: node scripts/report-boat1-high-score.mjs retrospective-exclusion-*.json
import fs from 'node:fs';
const paths=process.argv.slice(2);
if(!paths.length)throw Error('Provide retrospective evidence JSON files');
const rows=[],held=[],seen=new Set();
function referenceSix(order){
 const combos=[];
 for(const a of order.slice(0,3))for(const b of order.slice(0,4))for(const c of order){
  if(a===b||b===c||a===c)continue;
  combos.push({pick:[a,b,c].join('-'),rank:order.indexOf(a)*100+order.indexOf(b)*10+order.indexOf(c)});
 }
 return combos.sort((x,y)=>x.rank-y.rank||x.pick.localeCompare(y.pick)).slice(0,6).map(x=>x.pick);
}
for(const path of paths){
 const data=JSON.parse(fs.readFileSync(path,'utf8'));
 if(data.mode!=='retrospective_current_app_diagnostic_not_pre_race_validation')throw Error('Unexpected source mode: '+path);
 for(const e of data.evidence||[]){
  const key=[e.date,e.venue,e.race].join(':');
  if(seen.has(key))throw Error('Duplicate race '+key);seen.add(key);
  const scores=e.boats,actual=e.officialFinish;
  if(e.scoreSource!=='current_app_recomputed_after_race'||e.resultVerified!==true||
   !Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x.boat)).size!==6||
   !scores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))||
   !Array.isArray(actual)||actual.length!==6||new Set(actual).size!==6||
   !actual.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){
    held.push({key,reason:'invalid_historical_evidence'});continue;
  }
  const ranked=[...scores].sort((a,b)=>b.score-a.score||a.boat-b.boat);
  if(ranked[0].boat!==1)continue;
  const gap=ranked[0].score-ranked[1].score;
  const order=ranked.map(x=>x.boat);
  const six=referenceSix(order);
  rows.push({key,gap,boat1Score:ranked[0].score,runnerUpScore:ranked[1].score,
   predictedOrder:order,actual:actual.slice(0,3),referenceSix:six,
   boat1Win:actual[0]===1,boat1TopTwo:actual.slice(0,2).includes(1),
   boat1TopThree:actual.slice(0,3).includes(1),
   topTwoExact:actual[0]===1&&actual[1]===order[1],
   topTwoAnyOrder:order.slice(0,2).every(x=>actual.slice(0,2).includes(x)),
   referenceSixHit:six.includes(actual.slice(0,3).join('-'))});
 }
 for(const h of data.held||[])held.push({key:h.key,reason:h.reason||'source_held'});
}
function summary(items){
 const n=items.length,counts=Object.fromEntries(['boat1Win','boat1TopTwo','boat1TopThree','topTwoExact','topTwoAnyOrder','referenceSixHit'].map(k=>[k,items.filter(x=>x[k]).length]));
 return {races:n,...counts,rates:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,n?v/n:null]))};
}
const groups={boat1_top_score_all:summary(rows),
 boat1_lead_at_least_3:summary(rows.filter(x=>x.gap>=3)),
 boat1_lead_at_least_6:summary(rows.filter(x=>x.gap>=6)),
 boat1_lead_below_3:summary(rows.filter(x=>x.gap<3)),
 boat1_lead_3_to_below_6:summary(rows.filter(x=>x.gap>=3&&x.gap<6))};
const result={mode:'retrospective_boat1_top_score_only',sourceFiles:paths,
 eligible:rows.length,held:held.length,groups,details:rows,heldDetails:held,
 note:'Only races with boat 1 ranked first by current recomputed historical scores. Reference six picks are NOT the app six independent methods. Rates are retrospective diagnostics, not pre-race hit rates.'};
const file='historical-boat1-high-score-report.json';
fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file,eligible:result.eligible,held:result.held,groups},null,2));
