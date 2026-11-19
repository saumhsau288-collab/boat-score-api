// Research-only paired comparison. Both models must use the same verified pre-race snapshots.
// Do not treat an archived finishing order as a pre-race feature.
import {scoreInsideStartRace,EXPERIMENTAL_WEIGHTS} from './inside-start-historical-research.mjs';
import {splitScoreLeaderTickets} from './score-leader-favorite-upset.mjs';
const uniquePodium=a=>Array.isArray(a)&&a.length===3&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(a).size===3;
const exact=(tickets,podium)=>tickets.some(t=>t.join('-')===podium.join('-'));
const metrics=()=>({races:0,firstCorrect:0,podiumOverlap:0,exactOrderedTop3:0,mainExact:0,upsetExact:0,eitherExact:0});
function add(m,p,actual){
 const ranked=p.ranked;
 const top3=ranked.slice(0,3).map(x=>x.boat);
 const t=splitScoreLeaderTickets(ranked);
 if(!t.ready)throw Error('Invalid ticket ranking');
 const main=exact(t.main,actual),upset=exact(t.upset,actual);
 m.races++;m.firstCorrect+=Number(top3[0]===actual[0]);
 m.podiumOverlap+=top3.filter(x=>actual.includes(x)).length;
 m.exactOrderedTop3+=Number(top3.join('-')===actual.join('-'));
 m.mainExact+=Number(main);m.upsetExact+=Number(upset);m.eitherExact+=Number(main||upset);
}
export function compareInsideStartTickets(rows,{baselineWeights,experimentalWeights=EXPERIMENTAL_WEIGHTS}={}){
 if(!Array.isArray(rows)||!baselineWeights)throw Error('Rows and explicit baseline weights required');
 const baseline=metrics(),experimental=metrics(),excluded=[];
 for(const r of rows){
  const timeOk=Number.isFinite(Date.parse(r?.capturedAt))&&Number.isFinite(Date.parse(r?.cutoffAt))&&Date.parse(r.capturedAt)<Date.parse(r.cutoffAt);
  const verified=r?.verifiedPreRace===true&&r?.verifiedOfficialResult===true&&timeOk&&uniquePodium(r?.actual);
  const a=verified?scoreInsideStartRace(r.boats,{weights:baselineWeights}):null;
  const b=verified?scoreInsideStartRace(r.boats,{weights:experimentalWeights}):null;
  if(!verified||a.status!=='research_only'||b.status!=='research_only'){
   excluded.push({race:r?.race??null,reason:'unverified_or_incomplete'});continue;
  }
  add(baseline,a,r.actual);add(experimental,b,r.actual);
 }
 return {status:'research_only',baseline,experimental,excluded,
  difference:Object.fromEntries(Object.keys(baseline).filter(k=>k!=='races').map(k=>[k,experimental[k]-baseline[k]])),
  approvedForDeployment:false,warning:'Comparison is only meaningful with independently verified pre-race snapshots and a later untouched holdout. Baseline weights must be an explicit comparable proxy, not claimed deployed scores.'};
}
