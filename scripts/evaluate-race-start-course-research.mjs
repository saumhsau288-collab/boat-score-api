// Research-only race-relative rating. Never connected to the public predictor.
// Keep official national/local win rates averaged rather than summed.
import {evaluateRace} from '../boat-score-2-scoring.js';
export function evaluateRaceWithStartAndCourse(racers,{abilityWeight=.8,startWeight=.15,courseWeight=.05}={}){
 const weights=[abilityWeight,startWeight,courseWeight];
 if(weights.some(w=>!Number.isFinite(w)||w<0)||Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-9)
  throw Error('weights_must_be_nonnegative_and_sum_to_one');
 const base=evaluateRace(racers);
 if(base.status!=='evaluated')return {status:base.status,racers:base.racers,warning:'Missing or invalid base score inputs; no inferred replacement.'};
 if(racers.some(r=>!Number.isFinite(r.avgStart)||r.avgStart<0||r.avgStart>.4))
  return {status:'insufficient_start_data',racers:[],warning:'Average start is required; never assume an unknown ST.'};
 const byBoat=new Map(racers.map(r=>[r.boat,r]));
 const rated=base.racers.map(r=>{
  const startScore=100*(.4-byBoat.get(r.boat).avgStart)/.4;
  const courseScore=100*(6-r.boat)/5;
  const score=abilityWeight*r.score+startWeight*startScore+courseWeight*courseScore;
  return {boat:r.boat,abilityScore:r.score,startScore:Number(startScore.toFixed(2)),courseScore,score:Number(score.toFixed(2))};
 });
 return {status:'evaluated',weights:{abilityWeight,startWeight,courseWeight},racers:rated.sort((a,b)=>b.score-a.score||a.boat-b.boat),warning:'Heuristic, not calibrated. avgStart is a historical mean, not race-day start exhibition. Course score assumes lane equals boat number; do not use if entry order changes.'};
}
