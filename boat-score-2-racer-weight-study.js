// Offline racer-weight study. Only structurally eligible, verified pre-race rows.
// No production changes; provenance flags must be independently audited.
import {compareHistoricalRace} from './boat-score-2-historical-comparison.js';
export const RACER_WEIGHT_CANDIDATES=Object.freeze([
 Object.freeze({ability:70,start:20,course:10}),
 Object.freeze({ability:75,start:20,course:5}),
 Object.freeze({ability:75,start:15,course:10}),
 Object.freeze({ability:65,start:25,course:10}),
 Object.freeze({ability:65,start:20,course:15})
]);
const score=(r,w)=>{
 const mean=(r.nationalWinRate+r.localWinRate)/2;
 const start=Math.max(0,Math.min(1,(0.30-r.averageStartTiming)/0.30));
 const course=(6-r.entryCourse)/5;
 return mean/10*w.ability+start*w.start+course*w.course;
};
function metric(rows,w){
 let winnerHits=0,winnerRankSum=0,podiumSetHits=0;
 for(const row of rows){
  const ranked=[...row.racers].sort((a,b)=>score(b,w)-score(a,w)||a.boat-b.boat).map(r=>r.boat);
  const finish=row.finishOrder;
  if(ranked[0]===finish[0])winnerHits++;
  winnerRankSum+=ranked.indexOf(finish[0])+1;
  if(ranked.slice(0,3).every(b=>finish.slice(0,3).includes(b)))podiumSetHits++;
 }
 return {eligible:rows.length,winnerHits,winnerRankSum,podiumSetHits};
}
export function studyRacerWeights(rows,{minTrain=30,minHoldout=15}={}){
 if(!Array.isArray(rows)||!Number.isInteger(minTrain)||!Number.isInteger(minHoldout)||minTrain<1||minHoldout<1)
  return {status:'invalid_input'};
 const seen=new Set(),eligible=[],excludedReasons={};
 for(const row of rows){
  const hasIdentity=row&&/^20\d{6}$/.test(String(row.date))&&Number.isInteger(row.venue)&&Number.isInteger(row.race);
  const key=hasIdentity?[row.date,row.venue,row.race].join(':'):null;
  if(key!==null&&seen.has(key))return {status:'duplicate_races',key};
  if(key!==null)seen.add(key);
  const audit=compareHistoricalRace(row);
  if(audit.status==='compared')eligible.push(row);
  else excludedReasons[audit.reason]=(excludedReasons[audit.reason]||0)+1;
 }
 eligible.sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.venue-b.venue||a.race-b.race);
 const dates=[...new Set(eligible.map(r=>String(r.date)))];
 let split=-1;
 for(let i=1;i<dates.length;i++){
  const n=eligible.filter(r=>String(r.date)<dates[i]).length;
  if(n>=minTrain&&eligible.length-n>=minHoldout)split=i;
 }
 if(split<0)return {status:'insufficient_verified_history',total:rows.length,eligible:eligible.length,
  excludedReasons,distinctDates:dates.length,minTrain,minHoldout,candidateWeights:null};
 const cutoff=dates[split],train=eligible.filter(r=>String(r.date)<cutoff),holdout=eligible.filter(r=>String(r.date)>=cutoff);
 const ranked=RACER_WEIGHT_CANDIDATES.map(weights=>({weights,training:metric(train,weights)}))
  .sort((a,b)=>b.training.winnerHits-a.training.winnerHits||
   a.training.winnerRankSum-b.training.winnerRankSum||
   b.training.podiumSetHits-a.training.podiumSetHits||
   RACER_WEIGHT_CANDIDATES.indexOf(a.weights)-RACER_WEIGHT_CANDIDATES.indexOf(b.weights));
 const chosen=ranked[0];
 const baseline=RACER_WEIGHT_CANDIDATES[0];
 const baselineHoldout=metric(holdout,baseline),candidateHoldout=metric(holdout,chosen.weights);
 return {status:'research_only',total:rows.length,eligible:eligible.length,excludedReasons,
  trainingCount:train.length,holdoutCount:holdout.length,holdoutStartDate:cutoff,
  baselineWeights:baseline,candidateWeights:chosen.weights,baselineHoldout,candidateHoldout,
  improvedOnHoldout:candidateHoldout.winnerHits>baselineHoldout.winnerHits,
  warning:'Research only. Source flags are not independent authentication. No production weight changes or proven prediction improvement.'};
}
