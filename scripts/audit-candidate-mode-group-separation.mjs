import {compareCandidateModes} from './compare-candidate-modes.mjs';
// Detect whether removing candidate gates makes main/upset scenarios converge.
// Distinct tickets alone do not imply distinct first-place narratives.
export function auditCandidateModeGroupSeparation(racers){
 const comparison=compareCandidateModes(racers);
 const report={};
 for(const mode of ['legacy','unrestricted']){
  const main=comparison[mode].main,upset=comparison[mode].upset;
  const m=new Set(main.map(t=>t[0])),u=new Set(upset.map(t=>t[0]));
  const intersection=[...m].filter(n=>u.has(n)).sort((a,b)=>a-b);
  const all=[...main,...upset];
  report[mode]={mainFirst:[...m].sort((a,b)=>a-b),upsetFirst:[...u].sort((a,b)=>a-b),sharedFirst:intersection,sharedFirstCount:intersection.length,distinctTickets:new Set(all.map(t=>t.join('-'))).size};
 }
 return {report,warning:'Shared first-place candidates across main/upset are descriptive only; no official results or hit rates assessed.'};
}
