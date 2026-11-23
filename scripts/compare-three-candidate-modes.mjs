import {predictTwelveIndependentHypotheses} from './predict-twelve-independent-hypotheses.mjs';
const modes=['legacy','unrestricted','rank_relative'];
export function compareThreeCandidateModes(racers){
 const results=Object.fromEntries(modes.map(mode=>[mode,predictTwelveIndependentHypotheses(racers,{candidateMode:mode})]));
 const top=Math.max(...racers.map(x=>x.score));
 const topBoats=racers.filter(x=>Math.abs(x.score-top)<=1e-9).map(x=>x.boat).sort((a,b)=>a-b);
 const inside=racers.filter(x=>(x.course??x.boat)<=3);
 const topInside=Math.max(...inside.map(x=>x.score));
 const strongInsideBoats=inside.filter(x=>Math.abs(x.score-topInside)<=1e-9).map(x=>x.boat).sort((a,b)=>a-b);
 const rankRelativeFallback=false;
 const rows=results.legacy.main.concat(results.legacy.upset).map((baseline,i)=>{
  const tickets=Object.fromEntries(modes.map(mode=>{
   const picks=results[mode].main.concat(results[mode].upset);
   return [mode,picks[i].ticket];
  }));
  return {strategyId:baseline.strategyId,group:baseline.group,tickets,
   changedFromLegacy:Object.fromEntries(modes.slice(1).map(mode=>[mode,tickets[mode].join('-')!==tickets.legacy.join('-')]))};
 });
 const summary=Object.fromEntries(modes.map(mode=>{
  const picks=results[mode].main.concat(results[mode].upset);
  const firstCounts=Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,picks.filter(x=>x.ticket[0]===i+1).length]));
  const m=new Set(results[mode].main.map(x=>x.ticket[0])),u=new Set(results[mode].upset.map(x=>x.ticket[0]));
  return [mode,{distinctTickets:results[mode].distinctTickets,firstCounts,sharedMainUpsetFirst:[...m].filter(x=>u.has(x)).sort((a,b)=>a-b),upsetFirstOnTopAbility:results[mode].upset.filter(x=>topBoats.includes(x.ticket[0])).length,
   upsetFirstOnStrongInside:results[mode].upset.filter(x=>strongInsideBoats.includes(x.ticket[0])).length,changedTicketsFromLegacy:rows.filter(x=>x.changedFromLegacy[mode]===true).length}];
 }));
 return {topAbilityBoats:topBoats,strongInsideBoats,rankRelativeFallback,rankRelativeInterpretation:'Rank-relative upset excludes strongest pre-race inside-course boat(s), including ties, from first place; this is not a proven race outcome.',rows,summary,warning:'No race results, payouts or hit-rate evidence; descriptive same-input research only.'};
}
