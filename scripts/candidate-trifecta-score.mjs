// Research-only ordered-trifecta candidate. Never deployed automatically.
// Pre-race scores only; no outcome or race result is accepted as input.
import {scoreWinnerCandidates} from './candidate-winner-score.mjs';
export function rankTrifectaCandidates(racers,{innerAdvantage=0.6,abilityWeight=1,secondInside=0.25,thirdInside=0.1,limit=12}={}){
 if(!Number.isInteger(limit)||limit<1||limit>120)throw Error('invalid limit');
 for(const x of [secondInside,thirdInside])if(!Number.isFinite(x)||x<0)throw Error('invalid positional weight');
 const winners=scoreWinnerCandidates(racers,{innerAdvantage,abilityWeight});
 const candidates=[];
 for(const first of winners)for(const second of winners)for(const third of winners){
  if(new Set([first.boat,second.boat,third.boat]).size!==3)continue;
  const score=first.score*1.6+(second.ability+secondInside*second.inside)*1.0+(third.ability+thirdInside*third.inside)*0.6;
  candidates.push({order:[first.boat,second.boat,third.boat],score});
 }
 candidates.sort((a,b)=>b.score-a.score||a.order.join('').localeCompare(b.order.join('')));
 return {main:candidates.slice(0,limit),evaluated:candidates.length,
  winnerRanking:winners.map(x=>({boat:x.boat,score:x.score})),
  warning:'Research-only pre-race candidate. Not validated against prospective outcomes; not deployed.'};
}
