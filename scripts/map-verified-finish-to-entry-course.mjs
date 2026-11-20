// Offline-only mapping of independently verified official finish BOAT numbers to actual ENTRY courses.
// Does not replace official boat-number trifecta settlement or infer courses from boat numbers.
export function finishOrderByVerifiedEntryCourse(officialResult,courseMapping){
 const finish=officialResult?.finishOrder;
 if(officialResult?.verified!==true||!Array.isArray(finish)||finish.length!==6||
  new Set(finish).size!==6||finish.some(n=>!Number.isInteger(n)||n<1||n>6))
  return {status:'held',reason:'verified_six_boat_finish_required'};
 if(!Array.isArray(courseMapping)||courseMapping.length!==6)
  return {status:'held',reason:'verified_six_entry_courses_required'};
 const byBoat=new Map(),courses=new Set();
 for(const row of courseMapping){
  if(row?.verified!==true||!Number.isInteger(row.boat)||row.boat<1||row.boat>6||
   !Number.isInteger(row.entryCourse)||row.entryCourse<1||row.entryCourse>6||
   byBoat.has(row.boat)||courses.has(row.entryCourse))
   return {status:'held',reason:'invalid_or_duplicate_entry_course_mapping'};
  byBoat.set(row.boat,row.entryCourse);courses.add(row.entryCourse);
 }
 return {status:'mapped',finishByBoat:finish.slice(),finishByEntryCourse:finish.map(boat=>byBoat.get(boat)),
  podiumByBoat:finish.slice(0,3).join('-'),
  podiumByEntryCourse:finish.slice(0,3).map(boat=>byBoat.get(boat)).join('-'),
  note:'Official betting outcomes use boat numbers; entry-course finish order is an analysis view only.'};
}
