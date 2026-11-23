// Boat Score 2 research preview only. Never wired into deployed worker.js.
// This bridge requires verified, complete six-racer inputs; no fabricated ST or scores.
import {evaluateRacer} from './boat-score-2-scoring.js';
import {predictTwelveIndependentHypotheses} from './scripts/predict-twelve-independent-hypotheses.mjs';
import {validateRaceSelection} from './boat-score-2-adapter.js';
import {validateSixRacerSourceInputs} from './scripts/validate-six-racer-source-inputs.mjs';

export function evaluateRelativeInsidePreview(payload){
 const selection=validateRaceSelection(payload);
 if(!selection.valid)return {status:'invalid_selection',invalid:selection.invalid};
 if(payload?.verified!==true)return {status:'unverified_source'};
 const check=validateSixRacerSourceInputs(payload.racers);
 if(!check.originalInputsPresent)return {status:'insufficient_original_inputs',missing:check.errors};
 const ranked=payload.racers.map(r=>{
  const score=evaluateRacer(r);
  return {boat:r.boat,course:r.course,score:score.score,avgStart:r.startTiming,status:score.status};
 });
 if(ranked.some(r=>r.status!=='evaluated'||!Number.isFinite(r.score)))
  return {status:'insufficient_scores'};
 const predicted=predictTwelveIndependentHypotheses(ranked,{candidateMode:'rank_relative'});
 const byBoat=new Map(ranked.map(r=>[r.boat,r]));
 const upset=predicted.upset.map(p=>{
  const winner=byBoat.get(p.ticket[0]);
  const beatenInside=ranked.filter(r=>r.course<winner.course&&r.score>winner.score+1e-9)
   .sort((a,b)=>b.score-a.score||a.course-b.course);
  return {...p,beatenHigherScoringInside:beatenInside.map(r=>({boat:r.boat,course:r.course,score:r.score})),
   supportedRelativeUpset:beatenInside.length>0&&!p.relativeInsideFallback};
 });
 return {status:'research_preview',venue:payload.venue,date:payload.date,race:Number(payload.race),
  candidateMode:'rank_relative',main:predicted.main,upset,
  supportedUpsetCount:upset.filter(x=>x.supportedRelativeUpset).length,
  warning:'Research preview only. ST is a historical/start-timing input supplied by the verified source, not necessarily same-day exhibition ST. No historical hit rate or payout validation. Never deploy to production without full integration checks.'};
}
