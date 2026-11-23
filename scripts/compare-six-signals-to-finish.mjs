// Research-only comparison of pre-race signal groups with an independently supplied result.
// This does not verify result authenticity or capture timing.
import {groupSixCandidates} from './group-six-candidates.mjs';
import {analyzeSixSignalAgreement} from './analyze-six-signal-agreement.mjs';
const validOrder=xs=>Array.isArray(xs)&&xs.length===6&&
 xs.every(x=>Number.isInteger(x)&&x>=1&&x<=6)&&new Set(xs).size===6;
export function compareSixSignalsToFinish({racers,finishOrder,preRaceCaptured=false,officialResultVerified=false}={}){
 if(!validOrder(finishOrder))return {status:'invalid_finish_order'};
 if(preRaceCaptured!==true||officialResultVerified!==true)
  return {status:'unverified_evidence',reason:'Requires independently verified pre-race capture and official result'};
 const grouped=groupSixCandidates(racers);
 const agreement=analyzeSixSignalAgreement(racers);
 if(grouped.status!=='research_only'||agreement.status!=='research_only')
  return {status:'insufficient_input',groupStatus:grouped.status};
 const podium=finishOrder.slice(0,3);
 const winners=new Set(podium);
 const sets={favorites:grouped.favorites,counterCandidates:grouped.counterCandidates,
  singleSignal:grouped.singleSignal,unsupported:grouped.unsupported};
 const groupStats=Object.fromEntries(Object.entries(sets).map(([name,boats])=>
  [name,{candidates:boats.length,podiumHits:boats.filter(b=>winners.has(b)).length,
   winnerIncluded:boats.includes(finishOrder[0])}]));
 const rows=agreement.rows.map(row=>({
  boat:row.boat,finishPosition:finishOrder.indexOf(row.boat)+1,
  topThreeSignalCount:row.topThreeSignalCount,
  supportedBy:row.supportedBy,firstBy:row.firstBy,
  podium:winners.has(row.boat)
 }));
 const signalStats=Object.fromEntries(['ability','start','course'].map(name=>{
  const supported=rows.filter(r=>r.supportedBy.includes(name));
  return [name,{topThreeCandidates:supported.length,
   podiumHits:supported.filter(r=>r.podium).length,
   winnerSupported:supported.some(r=>r.boat===finishOrder[0])}];
 }));
 return {status:'research_only',finishOrder:[...finishOrder],rows,groupStats,signalStats,
  calibrated:false,warning:'Flags are assertions from caller, not independently authenticated by this function. No hit-rate estimate from one race.'};
}
