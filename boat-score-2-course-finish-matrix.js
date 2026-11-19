// Boat Score 2: validated course (1..6) x finish (1..6) counts.
// This module never infers course from boat number or table row order.
export function validateCourseFinishMatrix(matrix) {
 if (!Array.isArray(matrix) || matrix.length !== 6) return {verified:false,reason:'six_courses_required'};
 for (let i=0;i<6;i++) {
  const row=matrix[i];
  if (!row || row.course!==i+1 || !Array.isArray(row.finishes) || row.finishes.length!==6 ||
    row.finishes.some(n=>!Number.isInteger(n)||n<0))
   return {verified:false,reason:'invalid_course_finish_row',course:i+1};
 }
 return {verified:true,reason:null};
}
export function scoreCourseFinishEvidence(matrix, course, sampleSize) {
 const checked=validateCourseFinishMatrix(matrix);
 if(!checked.verified)return {verified:false,reason:checked.reason};
 if(!Number.isInteger(course)||course<1||course>6)return {verified:false,reason:'invalid_course'};
 const totals=matrix.map(row=>row.finishes.reduce((a,b)=>a+b,0));
 const total=totals.reduce((a,b)=>a+b,0);
 if(!Number.isInteger(sampleSize)||sampleSize<=0||total!==sampleSize)
  return {verified:false,reason:'sample_size_not_verified',observed:total};
 const finishes=matrix[course-1].finishes;
 const starts=totals[course-1];
 if(starts===0)return {verified:false,reason:'no_starts_in_course',starts:0};
 return {verified:true,course,starts,totalSample:total,
  firstRate:finishes[0]/starts,top2Rate:(finishes[0]+finishes[1])/starts,
  top3Rate:(finishes[0]+finishes[1]+finishes[2])/starts,
  counts:[...finishes],note:'Historical course evidence only, not a guaranteed prediction.'};
}
