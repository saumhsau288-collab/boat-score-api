// Research-only alternative three-feature weight screening.
// Training and evaluation MUST use separate historical dates. Never tune on
// the same 12 Tokuyama races used to discover a candidate.
import {joinHistoricalRacelistAndResults} from './join-historical-racelist-result-identities.mjs';
const KEYS=['nationalWinRate','localWinRate','motorTwoWinRate'];
const LIMIT=[10,10,100];
const BASE=[45,25,15];
function score(row,weights){
 return KEYS.reduce((s,k,i)=>s+weights[i]*(k==='localWinRate'&&row[k]===0?row.nationalWinRate:row[k])/LIMIT[i],0);
}
function evaluate(records,weights){
 let correct=0,ties=0,podium=0;
 for(const r of records){
  const ranked=[...r.rows].sort((a,b)=>score(b,weights)-score(a,weights)||a.boat-b.boat);
  if(Math.abs(score(ranked[0],weights)-score(ranked[1],weights))<1e-9)ties++;
  else if(ranked[0].winner)correct++;
  podium+=ranked.slice(0,3).filter(x=>x.podium).length;
 }
 return {races:records.length,correct,ties,decided:records.length-ties,
  winRate:records.length===ties?null:correct/(records.length-ties),
  podiumHits:podium,podiumPrecision:records.length?podium/(3*records.length):null};
}
export function screenHistoricalThreeFeatureWeights(races,{minTrain=100,minHoldout=30}={}){
 const records=[],excluded={};const seen=new Set();
 for(const pair of races){
  const j=joinHistoricalRacelistAndResults(pair.racelist,pair.result);
  const date=String(pair.racelist?.date||'');
  const key=[date,pair.racelist?.venue,pair.racelist?.race].join('|');
  if(j.status!=='retrospective_racer_identity_join'){excluded[j.reason]=(excluded[j.reason]||0)+1;continue;}
  if(!/^20\d{6}$/.test(date)||seen.has(key)){excluded.invalid_or_duplicate_identity=(excluded.invalid_or_duplicate_identity||0)+1;continue;}
  if(j.rows.some(r=>KEYS.some((k,i)=>!Number.isFinite(r[k])||r[k]<0||r[k]>LIMIT[i]))){excluded.invalid_metrics=(excluded.invalid_metrics||0)+1;continue;}
  seen.add(key);records.push({date,key,rows:j.rows});
 }
 records.sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
 const held=(reason)=>({status:'held',reason,total:races.length,eligible:records.length,excluded,
  eligibleForDeployment:false,proposedWeights:null});
 if(records.length<minTrain+minHoldout)return held('insufficient_independent_history');
 let split=records.length-minHoldout;
 while(split>0&&records[split-1].date===records[split].date)split--;
 if(split<minTrain)return held('chronological_date_split_unavailable');
 const train=records.slice(0,split),holdout=records.slice(split);
 const candidates=[BASE,...KEYS.flatMap((_,i)=>[-5,5].map(d=>BASE.map((w,j)=>j===i?w+d:j===((i+1)%3)?w-d:w)))
  .filter(w=>w.every(x=>x>=0))];
 const ranked=candidates.map((w,i)=>({name:i===0?'baseline':'candidate_'+i,
  weights:Object.fromEntries(KEYS.map((k,j)=>[k,w[j]])),
  train:evaluate(train,w),holdout:evaluate(holdout,w)}))
  .sort((a,b)=>(b.train.winRate??-1)-(a.train.winRate??-1)||
   b.train.podiumPrecision-a.train.podiumPrecision||a.name.localeCompare(b.name));
 const base=ranked.find(r=>r.name==='baseline'),best=ranked[0];
 const improved=best.name!=='baseline'&&best.train.winRate>base.train.winRate&&
  best.holdout.winRate>base.holdout.winRate&&
  best.train.podiumPrecision>=base.train.podiumPrecision&&
  best.holdout.podiumPrecision>=base.holdout.podiumPrecision;
 return {status:'historical_three_feature_research_only',trainRaces:train.length,holdoutRaces:holdout.length,
  candidates:ranked,proposedWeights:improved?best.weights:null,
  eligibleForDeployment:false,warning:'Historical pre-race metric validity and missing 15% of current features remain unverified; never deploy from this report.'};
}
