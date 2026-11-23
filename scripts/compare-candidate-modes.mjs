import {predictTwelveIndependentHypotheses} from './predict-twelve-independent-hypotheses.mjs';
// Paired input comparison: no outcome labels, odds, or post-race inputs.
export function compareCandidateModes(racers){
 const legacy=predictTwelveIndependentHypotheses(racers,{candidateMode:'legacy'});
 const unrestricted=predictTwelveIndependentHypotheses(racers,{candidateMode:'unrestricted'});
 const a=[...legacy.main,...legacy.upset],b=[...unrestricted.main,...unrestricted.upset];
 const byId=new Map(b.map(x=>[x.strategyId,x]));
 const comparisons=a.map(x=>{
  const y=byId.get(x.strategyId);
  if(!y)throw Error('missing_strategy_in_comparison');
  return {strategyId:x.strategyId,group:x.group,legacyTicket:x.ticket,unrestrictedTicket:y.ticket,sameTicket:x.ticket.join('-')===y.ticket.join('-'),sameFirst:x.ticket[0]===y.ticket[0]};
 });
 const sum=group=>{const rows=comparisons.filter(x=>x.group===group);return {strategies:rows.length,changedTickets:rows.filter(x=>!x.sameTicket).length,changedFirst:rows.filter(x=>!x.sameFirst).length};};
 return {legacy:{main:legacy.main.map(x=>x.ticket),upset:legacy.upset.map(x=>x.ticket)},unrestricted:{main:unrestricted.main.map(x=>x.ticket),upset:unrestricted.upset.map(x=>x.ticket)},summary:{main:sum('main'),upset:sum('upset')},comparisons,warning:'This is an input-matched comparison of two heuristic candidate gates, not a historical accuracy comparison.'};
}
