// Research-only: identify suspect identical deadline candidates for different races.
export function auditRepeatedCutoffCandidates(records){
 if(!Array.isArray(records))throw Error('records_array_required');
 const grouped=new Map();
 for(const row of records){
  const date=String(row?.date??''),venue=Number(row?.venue),race=Number(row?.race);
  const cutoffAt=row?.cutoffCandidate?.cutoffAt??row?.cutoffAt;
  if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||
   !Number.isInteger(race)||race<1||race>12||typeof cutoffAt!=='string'||
   !Number.isFinite(Date.parse(cutoffAt)))continue;
  const key=[date,venue,cutoffAt].join(':');
  if(!grouped.has(key))grouped.set(key,new Set());
  grouped.get(key).add(race);
 }
 const collisions=[...grouped.entries()].filter(([,races])=>races.size>1)
  .map(([key,races])=>({key,races:[...races].sort((a,b)=>a-b),
   reason:'identical_cutoff_candidate_for_different_races'}));
 return {scope:'REPEATED_CUTOFF_CANDIDATE_AUDIT',collisions,
  suspiciousGroups:collisions.length,verifiedCutoffs:0,
  warning:'A duplicate candidate is a warning, not proof of the correct cutoff. Never promote a candidate to independently verified evidence.'};
}
