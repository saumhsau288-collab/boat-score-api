// Offline research only. Scores must be captured before the race.
export function auditRelativeOutcomes(racers){
 if(!Array.isArray(racers)||racers.length!==6)throw Error('six racers required');
 for(const key of ['course','finish']){
  if(new Set(racers.map(r=>r[key])).size!==6||racers.some(r=>!Number.isInteger(r[key])||r[key]<1||r[key]>6))throw Error('invalid '+key);
 }
 if(racers.some(r=>!Number.isFinite(r.score)))throw Error('missing score');
 const pairs=[];
 for(const inside of racers)for(const outside of racers){
  if(inside.course>=outside.course||inside.score<=outside.score)continue;
  pairs.push({inside:inside.course,outside:outside.course,scoreGap:inside.score-outside.score,outsideFinishedAhead:outside.finish<inside.finish,outsideWon:outside.finish===1});
 }
 return {pairs,eligiblePairs:pairs.length,reversedPairs:pairs.filter(p=>p.outsideFinishedAhead).length};
}
