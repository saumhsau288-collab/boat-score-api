// Research-only deterministic spatial proxy, NOT physical boat trajectory reconstruction.
// Only accept independently authenticated pre-race input snapshots.
const validBoats=r=>Array.isArray(r)&&r.length===6&&new Set(r.map(x=>x.boat)).size===6&&r.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score)&&Number.isFinite(x.avgStart)&&x.avgStart>=0&&x.avgStart<=0.4);
const ticketKey=t=>t.join('-');
const rankTickets=(racers,spatial)=>{
 const byBoat=new Map(racers.map(r=>[r.boat,r]));
 const result=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  const A=byBoat.get(a),B=byBoat.get(b),C=byBoat.get(c);
  // Heuristic wall: close-starting adjacent inner boats obstruct outside attacks.
  const innerWall=spatial&&a>=3&&[1,2].every(n=>byBoat.get(n).avgStart<=A.avgStart+0.02)?0.75:0;
  // Heuristic passing lane: a faster outer boat can follow an attacking boat.
  const passingLane=spatial&&a>=3&&b>a&&B.avgStart<=A.avgStart+0.03?0.55:0;
  const insideProtection=spatial&&a<=2?0.3:0;
  const strength=A.score*.56+B.score*.29+C.score*.15-innerWall+passingLane+insideProtection;
  result.push({ticket:[a,b,c],strength});
 }
 result.sort((x,y)=>y.strength-x.strength||ticketKey(x.ticket).localeCompare(ticketKey(y.ticket)));
 const main=result.slice(0,6).map(x=>x.ticket);
 const used=new Set(main.map(ticketKey));
 const upset=result.filter(x=>x.ticket[0]>=4&&!used.has(ticketKey(x.ticket))).slice(0,6).map(x=>x.ticket);
 return {main,upset};
};
export function compareSpatialHypothesis(races){
 const rows=[],held=[];
 for(const r of races){
  const key=r?.raceKey??null;
  if(r?.independentlyVerifiedPreRace!==true||r?.officialResultVerified!==true||!validBoats(r?.racers)||!Array.isArray(r?.finishOrder)||r.finishOrder.length!==6||new Set(r.finishOrder).size!==6||r.finishOrder.some(n=>!Number.isInteger(n)||n<1||n>6)){
   held.push({raceKey:key,reason:'missing_authenticated_pre_race_inputs_or_result'});continue;
  }
  const actual=r.finishOrder.slice(0,3).join('-');
  const baseline=rankTickets(r.racers,false),spatial=rankTickets(r.racers,true);
  const hit=pred=>({main:pred.main.some(t=>ticketKey(t)===actual),upset:pred.upset.some(t=>ticketKey(t)===actual),any:[...pred.main,...pred.upset].some(t=>ticketKey(t)===actual)});
  rows.push({raceKey:key,actual,baseline:hit(baseline),spatial:hit(spatial)});
 }
 const count=(method,field)=>rows.filter(r=>r[method][field]).length;
 return {status:rows.length?'hypothetical_comparison':'insufficient_authenticated_races',eligible:rows.length,held:held.length,heldReasons:held,
  baseline:{mainHits:count('baseline','main'),upsetHits:count('baseline','upset'),anyHits:count('baseline','any')},
  spatial:{mainHits:count('spatial','main'),upsetHits:count('spatial','upset'),anyHits:count('spatial','any')},
  rows,productionChanged:false,warning:'Baseline uses archived score-weight ticket heuristic, NOT independently replayed deployed prediction. Spatial model is an uncalibrated wall/lane proxy, not verified physical trajectories. Flags supplied by callers require independent provenance audit; do not interpret flags alone as authentication.'};
}
