import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
// Research-only chronological out-of-sample evaluation of candidate weights.
// Historical inputs must be independently authenticated before using this function.
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
import {SCORE_WEIGHTS,validateResearchWeights,evaluateRacer} from '../boat-score-2-scoring.js';
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
  // The archived pre-cutoff score must match the unchanged baseline formula.
  // Otherwise the features and recorded score may be unrelated evidence.
  if(r.featureInputsByBoat.some((f,i)=>{
    const computed=evaluateRacer(f);
    return computed.status!=='evaluated'||Math.abs(computed.score-r.scoreInputsByBoat[i].score)>0.011;
  })){reject('archived_score_feature_mismatch');continue;}
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
 const candidates=[baseline,...FEATURES.map((_,i)=>baseline.map((w,j)=>j===i?w+5:w-5/(FEATURES.length-1))).filter(w=>w.every(n=>n>=0))];
 const score=(f,w)=>FEATURES.reduce((n,k,j)=>n+(k==='localWinRate'&&f[k]===0?f.nationalWinRate:f[k])/LIMITS[j]*w[j],0);
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
 const ranked=candidates.map((w,i)=>({name:i===0?'baseline':'candidate_'+i,weights:Object.fromEntries(FEATURES.map((k,j)=>[k,w[j]])),train:metric(train,w),holdout:metric(holdout,w)}))
  .sort((a,b)=>b.train.winRate-a.train.winRate||a.name.localeCompare(b.name));
 const best=ranked[0],base=ranked.find(c=>c.name==='baseline');
 const proposed=best.name!=='baseline'&&best.train.winRate>base.train.winRate&&best.holdout.winRate>base.holdout.winRate&&validateResearchWeights(best.weights)?best:null;
 return {status:'research_comparison_only',proposedResearchWeights:proposed?.weights??null,proposalReason:proposed?'train_and_holdout_improved':'no_confirmed_out_of_sample_improvement',total:records.length,eligible:eligible.length,excluded:exclusions,trainRaces:train.length,holdoutRaces:holdout.length,candidates:ranked,
  eligibleForDeployment:false,warning:'No automatic weight changes. Source verification flags require independent evidence, and holdout is evaluation only.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const input=process.argv[2];
 if(!input)throw Error('Usage: node scripts/evaluate-historical-weight-candidates.mjs verified-historical-records.json [report.json]');
 const report=evaluateWeightCandidates(JSON.parse(fs.readFileSync(input,'utf8')));
 const output=JSON.stringify(report,null,2)+'\n';
 if(process.argv[3])fs.writeFileSync(process.argv[3],output);
 console.log(output);
 if(report.status!=='research_comparison_only')process.exitCode=2;
}
