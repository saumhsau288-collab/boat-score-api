// Research-only ST and course advantage comparison. No production scoring changes.
// ST must be a verified pre-race average (seconds), not a post-race result.
export function compareStartAndCourse(racers) {
 if(!Array.isArray(racers)||racers.length!==6||
   new Set(racers.map(r=>r?.boat)).size!==6||
   new Set(racers.map(r=>r?.predictedCourse)).size!==6||
   racers.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||
     !Number.isInteger(r?.predictedCourse)||r.predictedCourse<1||r.predictedCourse>6))
  return {status:'invalid_race',racers:[]};
 const result=racers.map(r=>{
  const verified=r.startTimingVerified===true&&r.startTimingPreRace===true&&
    Number.isFinite(r.averageST)&&r.averageST>=0&&r.averageST<=1;
  return {boat:r.boat,course:r.predictedCourse,averageST:verified?r.averageST:null,
   startVerified:verified,insideCourse:r.predictedCourse<=3,
   note:verified?'Smaller ST indicates faster historical start, not a guaranteed start':'ST not verified'};
 });
 return {status:result.every(r=>r.startVerified)?'verified':'partial_or_unverified',
  racers:result,scoreChangeApplied:false,
  note:'Course advantage is contextual; no fixed advantage is assigned without historical validation.'};
}
