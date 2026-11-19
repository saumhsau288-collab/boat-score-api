// Research-only descriptive analysis: factor contributions versus individual rank error.
// Correlation here is NOT causation and is never an automatic weight update.
import {evaluateRacerScoreQuality} from './evaluate-racer-score-quality.mjs';
import {researchWeightCandidate} from './research-score-weights.mjs';
export function analyzeRacerFactorErrors(races){
 const factors=Object.keys(researchWeightCandidate);
 const byFactor=Object.fromEntries(factors.map(k=>[k,{samples:0,overrated:0,underrated:0,correctRank:0,pointsOverrated:0,pointsUnderrated:0,pointsCorrect:0}]));
 const acceptedKeys=new Set(),acceptedRaces=[],rejected=[];
 for(const race of races??[]){
  const key=[race?.date,race?.venue,race?.race].join(':');
  const rows=race?.racers;
  const eligible=race?.preRaceSnapshotVerified===true&&race?.resultIndependentlyVerified===true&&race?.chronologicalHoldout===true&&/^20\d{6}$/.test(String(race?.date??''))&&Number.isInteger(race?.venue)&&race.venue>=1&&race.venue<=24&&Number.isInteger(race?.race)&&race.race>=1&&race.race<=12&&Array.isArray(rows)&&rows.length===6&&new Set(rows.map(r=>r?.boat)).size===6&&new Set(rows.map(r=>r?.racerId)).size===6&&new Set(rows.map(r=>r?.finish)).size===6&&rows.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&/^\d{4}$/.test(String(r.racerId??''))&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100&&Number.isInteger(r.finish)&&r.finish>=1&&r.finish<=6&&factors.every(k=>Number.isFinite(r.factorPoints?.[k])&&r.factorPoints[k]>=0&&r.factorPoints[k]<=researchWeightCandidate[k])&&Math.abs(factors.reduce((sum,k)=>sum+r.factorPoints[k],0)-r.score)<1e-7)&&!acceptedKeys.has(key);
  if(!eligible){rejected.push(key);continue;}
  acceptedKeys.add(key);
  acceptedRaces.push(race);
  const ranked=rows.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat);
  ranked.forEach((r,i)=>{
   const category=i+1<r.finish?'overrated':i+1>r.finish?'underrated':'correctRank';
   const field=category==='overrated'?'pointsOverrated':category==='underrated'?'pointsUnderrated':'pointsCorrect';
   for(const k of factors){byFactor[k].samples++;byFactor[k][category]++;byFactor[k][field]+=r.factorPoints[k];}
  });
 }
 for(const v of Object.values(byFactor)){
  v.meanPointsOverrated=v.overrated?v.pointsOverrated/v.overrated:null;
  v.meanPointsUnderrated=v.underrated?v.pointsUnderrated/v.underrated:null;
  v.meanPointsCorrect=v.correctRank?v.pointsCorrect/v.correctRank:null;
 }
 return {researchOnly:true,eligibleRaces:acceptedKeys.size,rejectedRaces:rejected.length,byFactor,overallRankQuality:evaluateRacerScoreQuality(acceptedRaces),warning:'Descriptive associations only. Differences may reflect confounding, course, field strength, and noise; do not tune weights from these statistics alone.'};
}
