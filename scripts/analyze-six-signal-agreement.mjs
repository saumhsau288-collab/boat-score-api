// Research-only agreement diagnostics for the three independent input signals.
// This is not twelve separate trifecta strategies and is not calibrated.
import {rankSixAbilityCourseStart} from './rank-six-ability-course-start.mjs';
export function analyzeSixSignalAgreement(racers,options){
 const ranked=rankSixAbilityCourseStart(racers,options);
 if(ranked.status!=='research_only')return {status:ranked.status};
 const top3=ranked.podiumCandidates;
 const top1={ability:ranked.signals.ability[0],start:ranked.signals.start[0],course:ranked.signals.course[0]};
 const rows=ranked.rows.map(r=>{
  const supportedBy=Object.entries(top3).filter(([,boats])=>boats.includes(r.boat)).map(([name])=>name);
  const firstBy=Object.entries(top1).filter(([,boat])=>boat===r.boat).map(([name])=>name);
  return {boat:r.boat,course:r.course,abilityScore:r.abilityScore,
   startTiming:r.startTiming,supportedBy,topThreeSignalCount:supportedBy.length,
   firstBy,firstSignalCount:firstBy.length,
   disagreement:supportedBy.length===1?'single_signal_only':
    supportedBy.length===2?'two_signals':'three_signals'};
 });
 const sort=(a,b)=>b.topThreeSignalCount-a.topThreeSignalCount||
  b.firstSignalCount-a.firstSignalCount||b.abilityScore-a.abilityScore||
  a.course-b.course||a.boat-b.boat;
 const ordered=[...rows].sort(sort);
 return {status:'research_only',rows:rows.sort((a,b)=>a.boat-b.boat),
  consensusTopThree:ordered.slice(0,3).map(r=>r.boat),
  unanimousTopThree:rows.filter(r=>r.topThreeSignalCount===3).map(r=>r.boat),
  disputedTopThree:rows.filter(r=>r.topThreeSignalCount===1).map(r=>r.boat),
  zeroSignalBoats:rows.filter(r=>r.topThreeSignalCount===0).map(r=>r.boat),
  firstPlaceSignalAgreement:rows.filter(r=>r.firstSignalCount>=2).map(r=>r.boat),
  calibrated:false,
  warning:'Consensus is a diagnostic heuristic, not a predicted finish order or verified independent prediction method.'};
}
