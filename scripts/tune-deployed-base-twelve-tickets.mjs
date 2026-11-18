// Research only. Choose candidate from training dates; evaluate unseen later dates.
// Uses exact deployed base twelve-ticket replay, not the separate 100-point module.
import {DEPLOYED_BASE_WEIGHTS} from './replay-deployed-base-tickets.mjs';
import {compareDeployedBaseWeightVariants} from './compare-deployed-base-weight-variants.mjs';
const key=r=>r.date+':'+r.venue+':'+r.race;
export function tuneDeployedBaseTwelveTickets(rows,{minTrain=30,minTest=15}={}){
 if(!Array.isArray(rows)||!Number.isInteger(minTrain)||minTrain<1||!Number.isInteger(minTest)||minTest<1)return {status:'invalid_input'};
 const keys=rows.map(key);
 if(new Set(keys).size!==keys.length)return {status:'duplicate_races'};
 const sorted=[...rows].sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.venue-b.venue||a.race-b.race);
 const eligible=compareDeployedBaseWeightVariants(sorted,DEPLOYED_BASE_WEIGHTS);
 if(eligible.status!=='evaluated')return {status:'invalid_input'};
 const usable=new Set(eligible.races.map(key)),valid=sorted.filter(r=>usable.has(key(r)));
 const dates=[...new Set(valid.map(r=>r.date))];
 let split=-1;
 for(let i=1;i<dates.length;i++){const n=valid.filter(r=>r.date<dates[i]).length;if(n>=minTrain&&valid.length-n>=minTest)split=i;}
 if(split<0)return {status:'insufficient_verified_history',eligible:valid.length,excluded:eligible.excluded.length,distinctDates:dates.length,minTrain,minTest};
 const train=valid.filter(r=>r.date<dates[split]),test=valid.filter(r=>r.date>=dates[split]);
 const weights=[DEPLOYED_BASE_WEIGHTS];
 for(const delta of [-2,-1,1,2]){
  const national=5+delta,local=2-delta;
  if(local>=0&&national>=0)weights.push({...DEPLOYED_BASE_WEIGHTS,national,local});
 }
 for(const delta of [-2,-1,1,2]){
  const national=5+delta,motor=3-delta;
  if(motor>=0&&national>=0)weights.push({...DEPLOYED_BASE_WEIGHTS,national,motor});
 }
 const metric=x=>x.baseline.eitherHits;
 const candidates=weights.map(w=>({weights:w,train:compareDeployedBaseWeightVariants(train,w)}))
  .map(x=>({...x,trainHits:x.train.candidate.eitherHits,trainMainHits:x.train.candidate.mainHits,trainUpsetHits:x.train.candidate.upsetHits}))
  .sort((a,b)=>b.trainHits-a.trainHits||b.trainMainHits-a.trainMainHits||b.trainUpsetHits-a.trainUpsetHits||
   Math.abs(a.weights.national-5)+Math.abs(a.weights.local-2)+Math.abs(a.weights.motor-3)-
   Math.abs(b.weights.national-5)-Math.abs(b.weights.local-2)-Math.abs(b.weights.motor-3));
 const chosen=candidates[0],holdout=compareDeployedBaseWeightVariants(test,chosen.weights);
 const baseline=holdout.baseline,candidate=holdout.candidate;
 return {status:'evaluated',trainCount:train.length,testCount:test.length,trainDates:[dates[0],dates[split-1]],testDates:[dates[split],dates.at(-1)],
 baselineWeights:DEPLOYED_BASE_WEIGHTS,candidateWeights:chosen.weights,baselineHoldout:baseline,candidateHoldout:candidate,
 holdoutEitherHitDelta:candidate.eitherHits-baseline.eitherHits,improvedOnHoldout:candidate.eitherHits>baseline.eitherHits,
 candidateCount:weights.length,excludedCount:eligible.excluded.length,productionChanged:false,
 warning:'Only deployed base-score 12-ticket replay. Real input provenance flags require independent verification; no start/exhibition adjustments, no production change.'};
}
