// Research only: date-ordered follower-frequency baseline. Never train on a future race.
// Race records must have a YYYYMMDD date, venue, race, and a six-boat finishOrder.
export function chronologicalFollowerAudit(records=[]){
 const valid=records.filter(r=>/^20\d{6}$/.test(String(r?.date))&&Number.isInteger(r?.venue)&&Number.isInteger(r?.race)&&Array.isArray(r?.finishOrder)&&r.finishOrder.length===6&&new Set(r.finishOrder).size===6&&r.finishOrder.every(b=>Number.isInteger(b)&&b>=1&&b<=6));
 const key=r=>[r.date,r.venue,r.race].join('-');
 const counts=new Map(),duplicates=new Set();
 for(const r of valid){const k=key(r);counts.set(k,(counts.get(k)||0)+1);if(counts.get(k)>1)duplicates.add(k);}
 const ordered=valid.filter(r=>!duplicates.has(key(r))).sort((a,b)=>a.date.localeCompare(b.date)||a.venue-b.venue||a.race-b.race);
 const rows=[];
 for(const r of ordered){
  const winner=r.finishOrder[0],candidates=[1,2,3,4,5,6].filter(b=>b!==winner);
  // Same-day results are NOT used as training evidence; avoid hidden post-race timing leakage.
  const history=ordered.filter(t=>t.date<r.date&&t.finishOrder[0]===winner);
  const counts=Object.fromEntries(candidates.map(b=>[b,history.filter(t=>t.finishOrder[1]===b).length]));
  const choice=history.length>=30?[...candidates].sort((a,b)=>counts[b]-counts[a]||a-b)[0]:null;
  rows.push({date:r.date,venue:r.venue,race:r.race,winner,actualSecond:r.finishOrder[1],priorSameWinnerRaces:history.length,choice,correct:choice===r.finishOrder[1]&&choice!==null});
 }
 return {status:'historical_conditional_oracle_winner_not_pre_race_prediction',inputCount:records.length,validUniqueCount:ordered.length,duplicateKeys:[...duplicates],evaluated:rows.filter(r=>r.choice!==null).length,correct:rows.filter(r=>r.correct).length,rows,scoreChangeApplied:false};
}
