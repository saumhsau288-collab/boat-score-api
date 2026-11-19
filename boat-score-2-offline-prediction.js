// Experimental pre-race trifecta candidate generation. Not deployed, not calibrated.
import {experimentalRaceRanking} from './boat-score-2-racer-experiment.js';
import {analyzeEntryChanges} from './boat-score-2-entry-alerts.js';
const permutations=boats=>{
 const result=[];
 for(const a of boats)for(const b of boats)for(const c of boats)
  if(a!==b&&a!==c&&b!==c)result.push([a,b,c]);
 return result;
};
export function predictExperimentalRace(racers,{weightStudy=null}={}){
 const ranking=experimentalRaceRanking(racers);
 if(ranking.status!=='evaluated')return {status:ranking.status,main:[],upset:[],reason:'Valid six-racer pre-race features are required'};
 // A candidate weight vector may be applied only after the study has enough
 // date-separated eligible history. This is still research, not production.
 if(weightStudy!==null&&(
   weightStudy.status!=='research_only'||
   weightStudy.improvedOnHoldout!==true||
   !Number.isInteger(weightStudy.trainingCount)||weightStudy.trainingCount<30||
   !Number.isInteger(weightStudy.holdoutCount)||weightStudy.holdoutCount<15||
   !weightStudy.candidateWeights||
   ['ability','start','course'].some(k=>!Number.isFinite(weightStudy.candidateWeights[k])||weightStudy.candidateWeights[k]<0)||
   Math.abs(['ability','start','course'].reduce((s,k)=>s+weightStudy.candidateWeights[k],0)-100)>1e-8))
   return {status:'uncalibrated_history',main:[],upset:[],reason:'Verified date-separated study with at least 30 training and 15 holdout races required'};
 const w=weightStudy?.candidateWeights;
 const score=new Map(racers.map(r=>{
  if(!w)return [r.boat,ranking.ranked.find(x=>x.boat===r.boat).score];
  const mean=(r.nationalWinRate+r.localWinRate)/2;
  const start=Math.max(0,Math.min(1,(0.30-r.averageStartTiming)/0.30));
  return [r.boat,mean/10*w.ability+start*w.start+(6-r.entryCourse)/5*w.course];
 }));
 const ranked=[...ranking.ranked].sort((a,b)=>score.get(b.boat)-score.get(a.boat)||a.boat-b.boat);
 const all=permutations(ranked.map(x=>x.boat)).map(boats=>({
  boats, ticket:boats.join('-'),
  heuristic:Math.round((score.get(boats[0])*0.5+score.get(boats[1])*0.3+score.get(boats[2])*0.2)*100)/100
 }));
 const ordered=all.sort((a,b)=>b.heuristic-a.heuristic||a.ticket.localeCompare(b.ticket));
 const favorite=ranked[0].boat;
 const main=ordered.filter(x=>x.boats[0]===favorite).slice(0,6);
 const upset=ordered.filter(x=>x.boats[0]!==favorite).slice(0,6);
 return {status:'experimental',ranking:ranked,main,upset,ties:ranking.ties,weightsApplied:w||null,
  entryAlerts:analyzeEntryChanges(racers,{source:'prediction'}),
  warning:'Heuristic candidate order only. Not calibrated win probabilities, not verified betting recommendations; real pre-race data and holdout validation are required.'};
}
