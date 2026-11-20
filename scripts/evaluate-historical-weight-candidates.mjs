// Research-only chronological out-of-sample evaluation of candidate weights.
// Historical inputs must be independently authenticated before using this function.
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
import {SCORE_WEIGHTS} from '../boat-score-2-scoring.js';
export const FEATURES=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
const LIMITS=[10,10,100,100,100];
export function evaluateWeightCandidates(records,{minTrain=100,minHoldout=30}={}){
 if(!Array.isArray(records))throw new TypeError('records_must_be_array');
 const exclusions={};const eligible=[];const seen=new Set();
 const reject=k=>exclusions[k]=(exclusions[k]||0)+1;
 for(const r of records){
  const gate=verifyHistoricalRaceJoin(r);
  if(!gate.eligible){reject(gate.reason);continue;}
  const id=[r.expected.date,r.expected.venue,r.expected.race].join('|');
  if(seen.has(id)){reject('duplicate_race');continue;}
  seen.add(id);
  if(!Array.isArray(r.featureInputsByBoat)||r.featureInputsByBoat.length!==6||
   r.featureInputsByBoat.some((f,i)=>f?.boat!==i+1||f?.racerId!==r.scoreInputsByBoat[i].racerId||
    f?.sourceVerified!==true||FEATURES.some((k,j)=>typeof f[k]!=='number'||!Number.isFinite(f[k])||f[k]<0||f[k]>LIMITS[j]))){
   reject('authenticated_pre_cutoff_features_missing');continue;
  }
  eligible.push(r);
 }
 eligible.sort((a,b)=>a.expected.date.localeCompare(b.expected.date)||Number(a.expected.venue)-Number(b.expected.venue)||a.expected.race-b.expected.race);
 if(eligible.length<minTrain+minHoldout)return {status:'insufficient_verified_history',total:records.length,eligible:eligible.length,excluded:exclusions,required:minTrain+minHoldout,eligibleForDeployment:false};
 const target=eligible.length-minHoldout;
 let split=target;
 while(split>0&&eligible[split-1].expected.date===eligible[split].expected.date)split--;
 if(split<minTrain)return {status:'chronological_day_split_required',eligible:eligible.length,eligibleForDeployment:false};
 const train=eligible.slice(0,split),holdout=eligible.slice(split);
 const baseline=FEATURES.map(k=>SCORE_WEIGHTS[k]);
 const candidates=[baseline,...FEATURES.map((_,i)=>baseline.map((w,j)=>j===i?w+5:w-5/(FEATURES.length-1)))];
 const score=(f,w)=>FEATURES.reduce((n,k,j)=>n+f[k]/LIMITS[j]*w[j],0);
 const metric=(rows,w)=>{
  let wins=0,ties=0;
  for(const r of rows){
   const sorted=[...r.featureInputsByBoat].sort((a,b)=>score(b,w)-score(a,w));
   if(Math.abs(score(sorted[0],w)-score(sorted[1],w))<1e-9){ties++;continue;}
   const winner=r.finishByBoat.find(f=>f.finish===1)?.boat;
   if(sorted[0].boat===winner)wins++;
  }
  return {races:rows.length,wins,ties,winRate:wins/rows.length};
 };
 const ranked=candidates.map((w,i)=>({name:i===0?'baseline':'shift_to_'+FEATURES[i-1],weights:Object.fromEntries(FEATURES.map((k,j)=>[k,w[j]])),train:metric(train,w),holdout:metric(holdout,w)}))
  .sort((a,b)=>b.train.winRate-a.train.winRate||a.name.localeCompare(b.name));
 return {status:'research_comparison_only',total:records.length,eligible:eligible.length,excluded:exclusions,trainRaces:train.length,holdoutRaces:holdout.length,candidates:ranked,
  eligibleForDeployment:false,warning:'No automatic weight changes. Source verification flags require independent evidence, and holdout is evaluation only.'};
}
