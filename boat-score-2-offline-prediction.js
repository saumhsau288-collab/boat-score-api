// Experimental pre-race trifecta candidate generation. Not deployed, not calibrated.
import {experimentalRaceRanking} from './boat-score-2-racer-experiment.js';
const permutations=boats=>{
 const result=[];
 for(const a of boats)for(const b of boats)for(const c of boats)
  if(a!==b&&a!==c&&b!==c)result.push([a,b,c]);
 return result;
};
export function predictExperimentalRace(racers){
 const ranking=experimentalRaceRanking(racers);
 if(ranking.status!=='evaluated')return {status:ranking.status,main:[],upset:[],reason:'Valid six-racer pre-race features are required'};
 const ranked=ranking.ranked;
 const score=new Map(ranked.map(x=>[x.boat,x.score]));
 const all=permutations(ranked.map(x=>x.boat)).map(boats=>({
  boats, ticket:boats.join('-'),
  heuristic:Math.round((score.get(boats[0])*0.5+score.get(boats[1])*0.3+score.get(boats[2])*0.2)*100)/100
 }));
 const ordered=all.sort((a,b)=>b.heuristic-a.heuristic||a.ticket.localeCompare(b.ticket));
 const favorite=ranked[0].boat;
 const main=ordered.filter(x=>x.boats[0]===favorite).slice(0,6);
 const upset=ordered.filter(x=>x.boats[0]!==favorite).slice(0,6);
 return {status:'experimental',ranking:ranked,main,upset,ties:ranking.ties,
  warning:'Heuristic candidate order only. Not calibrated win probabilities, not verified betting recommendations; real pre-race data and holdout validation are required.'};
}
