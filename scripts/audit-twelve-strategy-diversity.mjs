// Research-only structural audit: separate distinct formulas from actual prediction diversity.
import {generateTwelveResearchPicks,STRATEGY_DEFINITIONS} from './twelve-independent-strategies.mjs';
export function auditTwelveStrategyDiversity(races){
 if(!Array.isArray(races))throw Error('races_must_be_array');
 const methods=Object.fromEntries(STRATEGY_DEFINITIONS.map(d=>[d.id,{group:d.group,eligible:0,noPick:0,soleFirstBoatStrategy:0,firstBoatCounts:{}}]));
 const pairs={},records=[];let invalid=0;
 for(const race of races){
  const r=generateTwelveResearchPicks(race.boats??race);
  if(r.status==='insufficient_verified_features'){invalid++;continue;}
  const chosen=r.picks.filter(p=>p.order);
  const firsts=new Set(chosen.map(p=>p.order[0]));
  const favoriteFirsts=new Set(chosen.filter(p=>p.group==='favorite').map(p=>p.order[0]));
  const upsetFirsts=new Set(chosen.filter(p=>p.group==='upset').map(p=>p.order[0]));
  for(const p of r.picks){const m=methods[p.strategy];if(!p.order){m.noPick++;continue;}m.eligible++;const first=String(p.order[0]);m.firstBoatCounts[first]=(m.firstBoatCounts[first]||0)+1;if(chosen.filter(x=>x.order?.[0]===p.order[0]).length===1)m.soleFirstBoatStrategy++;}
  for(let i=0;i<chosen.length;i++)for(let j=i+1;j<chosen.length;j++){const a=chosen[i],b=chosen[j],key=a.strategy+':'+b.strategy;if(!pairs[key])pairs[key]={compared:0,sameWinner:0,sameTopTwoSet:0};pairs[key].compared++;if(a.order[0]===b.order[0])pairs[key].sameWinner++;if([a.order[0],a.order[1]].sort().join('-')===[b.order[0],b.order[1]].sort().join('-'))pairs[key].sameTopTwoSet++;}
  records.push({date:race.date??null,venue:race.venue??null,race:race.race??null,generated:chosen.length,uniqueTickets:new Set(chosen.map(x=>x.order.join('-'))).size,distinctFirstBoats:firsts.size,favoriteDistinctFirstBoats:favoriteFirsts.size,upsetDistinctFirstBoats:upsetFirsts.size,winnerConcentration:chosen.length?Math.max(...Object.values(Object.fromEntries([...firsts].map(id=>[id,chosen.filter(p=>p.order[0]===id).length]))))/chosen.length:null,missingStrategies:r.picks.filter(p=>!p.order).map(p=>p.strategy)});
 }
 return {total:races.length,invalid,analyzed:records.length,methods,pairOverlap:pairs,records,warning:'Different scoring formulas and unique tickets do not establish independent forecasts, historical hit rate, or economic return.'};
}
