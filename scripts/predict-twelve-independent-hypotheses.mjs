// Research only: twelve distinct hypotheses, not twelve proven predictive models.
// Uses only six pre-race score and average-start inputs. No post-race information.
const valid=r=>Array.isArray(r)&&r.length===6&&new Set(r.map(x=>x.boat)).size===6&&r.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score)&&Number.isFinite(x.avgStart)&&x.avgStart>=0&&x.avgStart<=.4&&(x.course===undefined||(Number.isInteger(x.course)&&x.course>=1&&x.course<=6)));
const specs=[
 {id:'main_ability',group:'main',weights:[.64,.24,.12],inside:.10,start:.10},
 {id:'main_start',group:'main',weights:[.45,.35,.20],inside:.10,start:.60},
 {id:'main_inside',group:'main',weights:[.48,.32,.20],inside:.70,start:.15},
 {id:'main_balanced',group:'main',weights:[.50,.30,.20],inside:.30,start:.30},
 {id:'main_second_boat',group:'main',weights:[.35,.50,.15],inside:.25,start:.25},
 {id:'main_third_boat',group:'main',weights:[.40,.20,.40],inside:.25,start:.25},
 {id:'upset_outer_attack',group:'upset',weights:[.55,.30,.15],inside:-.65,start:.35},
 {id:'upset_outer_start',group:'upset',weights:[.45,.35,.20],inside:-.55,start:.75},
 {id:'upset_ability',group:'upset',weights:[.70,.20,.10],inside:-.40,start:.10},
 {id:'upset_second_boat',group:'upset',weights:[.30,.55,.15],inside:-.55,start:.35},
 {id:'upset_third_boat',group:'upset',weights:[.30,.20,.50],inside:-.50,start:.30},
 {id:'upset_wall_risk',group:'upset',weights:[.50,.30,.20],inside:-.35,start:.45,wall:.80}
];
const key=t=>t.join('-');
export function predictTwelveIndependentHypotheses(racers,options={}){
 const candidateMode=options?.candidateMode??'legacy';
 if(!['legacy','unrestricted','rank_relative'].includes(candidateMode))throw Error('invalid_candidate_mode');
 if(!valid(racers))throw Error('six_valid_pre_race_racers_required');
 if(racers.some(r=>r.course!==undefined)&&(!racers.every(r=>r.course!==undefined)||new Set(racers.map(r=>r.course)).size!==6))throw Error('six_unique_courses_required');
 const byBoat=new Map(racers.map(r=>[r.boat,r]));
 const topAbilityScore=Math.max(...racers.map(r=>r.score));
 const topAbilityBoats=new Set(racers.filter(r=>Math.abs(r.score-topAbilityScore)<=1e-9).map(r=>r.boat));
 const canExcludeTop=topAbilityBoats.size<6;
 const permutations=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)if(a!==b&&a!==c&&b!==c)permutations.push([a,b,c]);
 const used=new Set();
 const picks=specs.map(spec=>{
  const eligible=permutations.filter(t=>candidateMode==='unrestricted'||(candidateMode==='rank_relative'?(spec.group==='main'||!canExcludeTop||!topAbilityBoats.has(t[0])):(spec.group==='main'?t[0]<=3:t[0]>=4)));
  const score=t=>{
   const [a,b,c]=t.map(n=>byBoat.get(n));
   const weighted=spec.weights[0]*a.score+spec.weights[1]*b.score+spec.weights[2]*c.score;
   const start=spec.start*((.4-a.avgStart)*3+(.4-b.avgStart)*1.5+(.4-c.avgStart)*.5);
   const inside=spec.inside*(7-(a.course??a.boat))/6;
   const wall=spec.wall&&a.boat>=4&&byBoat.get(1).avgStart<=a.avgStart+.02&&byBoat.get(2).avgStart<=a.avgStart+.02?spec.wall:0;
   return weighted+start+inside-wall;
  };
  eligible.sort((a,b)=>score(b)-score(a)||key(a).localeCompare(key(b)));
  const ticket=eligible.find(t=>!used.has(key(t)));
  if(!ticket)throw Error('not_enough_unique_tickets');
  used.add(key(ticket));
  return {strategyId:spec.id,group:spec.group,ticket,heuristicScore:Number(score(ticket).toFixed(5))};
 });
 return {main:picks.filter(x=>x.group==='main'),upset:picks.filter(x=>x.group==='upset'),candidateMode,distinctStrategies:12,distinctTickets:used.size,warning:'Twelve different parameterized scoring hypotheses, not independently validated predictive methods. Legacy mode restricts first-place boats to 1-3 for main and 4-6 for upset; unrestricted mode removes these gates. Rank-relative mode permits any first-place boat for main but excludes the top pre-race ability-score boat from upset first place (all tied top-score boats excluded unless all six are tied, in which case no exclusion is possible). Course is used for inside advantage when supplied, otherwise boat is a proxy. No accuracy claim.'};
}
