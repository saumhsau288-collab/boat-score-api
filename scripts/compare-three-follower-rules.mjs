// Research only. Leave-one-out retrospective second-place selection with actual winner
// supplied as a CONDITION, not as a claimed pre-race prediction.
import {retrospectiveFiveRaces} from './describe-five-race-follower-winrates.mjs';
export function compareThreeSecondPlaceRules(records=retrospectiveFiveRaces){
 const rows=records.map((r,i)=>{
  const [winner,actualSecond]=r.finish;
  const candidates=[1,2,3,4,5,6].filter(b=>b!==winner);
  const winRateChoice=[...candidates].sort((a,b)=>r.winRates[b-1]-r.winRates[a-1]||a-b)[0];
  const training=records.filter((_,j)=>i!==j&&records[j].finish[0]===winner);
  const counts=Object.fromEntries(candidates.map(b=>[b,training.filter(x=>x.finish[1]===b).length]));
  // Zero same-winner training samples => no position-only claim or hybrid pick.
  const hasPositionEvidence=training.length>0;
  const positionChoice=hasPositionEvidence?[...candidates].sort((a,b)=>counts[b]-counts[a]||a-b)[0]:null;
  // Equal-scale combination of a smoothed conditional frequency and relative national win rate.
  // Exploratory formula only, never fitted on the held-out race.
  const rates=candidates.map(b=>r.winRates[b-1]),min=Math.min(...rates),max=Math.max(...rates);
  const hybridChoice=hasPositionEvidence?[...candidates].sort((a,b)=>{
   const score=b=>0.5*((counts[b]+1)/(training.length+5))+0.5*(max===min?0.5:(r.winRates[b-1]-min)/(max-min));
   return score(b)-score(a)||a-b;
  })[0]:null;
  return {venue:r.venue,race:r.race,winner,actualSecond,winRateChoice,positionChoice,hybridChoice,
   otherSameWinnerTrainingRaces:training.length,winRateCorrect:winRateChoice===actualSecond,
   positionCorrect:positionChoice===actualSecond,hybridCorrect:hybridChoice===actualSecond};
 });
 const commonRows=rows.filter(x=>x.winRateChoice!==null&&x.positionChoice!==null&&x.hybridChoice!==null);
 const commonSubset={evaluated:commonRows.length,correct:{nationalWinRate:commonRows.filter(x=>x.winRateCorrect).length,winnerConditionedPosition:commonRows.filter(x=>x.positionCorrect).length,hybrid:commonRows.filter(x=>x.hybridCorrect).length}};
 const summarize=(choice,correct)=>({evaluated:rows.filter(x=>x[choice]!==null).length,correct:rows.filter(x=>x[choice]!==null&&x[correct]).length});
 return {status:'retrospective_leave_one_out_actual_winner_conditioned',rows,
  commonSubset,
  methods:{nationalWinRate:summarize('winRateChoice','winRateCorrect'),winnerConditionedPosition:summarize('positionChoice','positionCorrect'),hybrid:summarize('hybridChoice','hybridCorrect')},
  warning:'Post-race official win rates; actual winner supplied; not prospective accuracy, model calibration or causal evidence.',
  scoringChanged:false};
}
