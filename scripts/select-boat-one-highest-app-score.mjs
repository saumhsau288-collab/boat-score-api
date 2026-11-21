// Strict filter: only the actual app-computed evaluation score can qualify boat 1.
// No fallback to national win rate or a newly invented score.
export function selectBoatOneHighestAppScore(records,{scoreField='evaluationScore'}={}){
 if(!Array.isArray(records))throw Error('records required');
 if(scoreField!=='evaluationScore')throw Error('only actual evaluationScore field supported');
 const selected=[],counts={examined:records.length,selected:0,missingScore:0,invalidRacers:0,tiedHighest:0,notHighest:0};
 for(const record of records){
  const rs=record?.racers;
  if(!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6)){counts.invalidRacers++;continue;}
  if(!rs.every(x=>typeof x.evaluationScore==='number'&&Number.isFinite(x.evaluationScore))){counts.missingScore++;continue;}
  const sorted=[...rs].sort((a,b)=>b.evaluationScore-a.evaluationScore||a.boat-b.boat);
  if(sorted[0].evaluationScore===sorted[1].evaluationScore){counts.tiedHighest++;continue;}
  if(sorted[0].boat!==1){counts.notHighest++;continue;}
  selected.push(record);counts.selected++;
 }
 return {selected,counts,warning:'Requires genuine app evaluationScore captured before the race. Never substitute national win rate. Boat 1 does not certify actual course 1.'};
}
