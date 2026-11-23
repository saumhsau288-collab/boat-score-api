import {predictTwelveIndependentHypotheses} from './predict-twelve-independent-hypotheses.mjs';
// Research-only diagnostic: each strategy's score and first-place role.
// Main/upset labels refer to parameterized heuristics, not guaranteed distinct outcomes.
export function auditStrategyFirstPlaceRoles(racers,mode='unrestricted'){
 const out=predictTwelveIndependentHypotheses(racers,{candidateMode:mode});
 const rows=[...out.main,...out.upset].map(p=>({strategyId:p.strategyId,group:p.group,first:p.ticket[0],ticket:p.ticket,heuristicScore:p.heuristicScore}));
 const byFirst=Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,{main:[],upset:[]}]));
 for(const row of rows)byFirst[row.first][row.group].push(row.strategyId);
 const shared=Object.entries(byFirst).filter(([,v])=>v.main.length&&v.upset.length).map(([boat,v])=>({boat:Number(boat),mainStrategies:v.main,upsetStrategies:v.upset}));
 return {mode,rows,sharedFirstStrategies:shared,sharedFirstBoats:shared.map(x=>x.boat),warning:'Shared first-place candidates do not establish duplicate methods or poor accuracy. No outcome labels used.'};
}
