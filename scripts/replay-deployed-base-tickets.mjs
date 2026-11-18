// Exact offline reproduction of deployed worker.js buildMorningRaceInputs rank scoring
// and rankTrifectaCandidates, as inspected on fix-boat-score-2-syntax-20261115.
// Excludes verified exhibition/start adjustments; not a complete live replay.
export const DEPLOYED_BASE_WEIGHTS=Object.freeze({national:5,local:2,motor:3,fallbackNational:7,fallbackMotor:3});
export function replayDeployedBaseTickets(stats,weights=DEPLOYED_BASE_WEIGHTS){
 if(!Array.isArray(stats)||stats.length!==6||new Set(stats.map(x=>x?.boat)).size!==6||stats.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6))return {ready:false,reason:'invalid_boats'};
 const valid=(n,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(stats.some(x=>!valid(x.win,10)||!valid(x.motor,100)))return {ready:false,reason:'missing_required_metrics'};
 const local=stats.every(x=>valid(x.local,10));
 const places=stats.every(x=>valid(x.top2,100)&&valid(x.top3,100)&&x.top3>=x.top2);
 const rank=k=>new Map([...stats].sort((a,b)=>b[k]-a[k]||a.boat-b.boat).map((x,i)=>[x.boat,6-i]));
 const wr=rank('win'),mr=rank('motor'),lr=local?rank('local'):null,p2=places?rank('top2'):null,p3=places?rank('top3'):null;
 const scores=stats.map(x=>({boat:x.boat,score:(local?weights.national*wr.get(x.boat)+weights.local*lr.get(x.boat)+weights.motor*mr.get(x.boat):weights.fallbackNational*wr.get(x.boat)+weights.fallbackMotor*mr.get(x.boat))+(places?(p2.get(x.boat)+p3.get(x.boat))/100:0)}));
 const byBoat=new Map(scores.map(x=>[x.boat,x.score])),comb=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  comb.push({boats:[a,b,c],strength:byBoat.get(a)*.56+byBoat.get(b)*.29+byBoat.get(c)*.15});
 }
 comb.sort((a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join('')));
 const main=comb.slice(0,6).map(x=>x.boats);
 const used=new Set(main.map(x=>x.join('-')));
 const upset=comb.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats);
 return {ready:true,main,upset,rankedScores:scores,method:local?'weighted_national50_local20_motor30_unvalidated':'weighted_racer70_motor30_screening_unvalidated',beforeinfoApplied:false};
}
