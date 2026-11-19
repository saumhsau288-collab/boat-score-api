// Convert explicitly labelled Makulabo course-by-finish rows into a matrix.
// This is research-only: no inference from colour, row order, or boat number.
import {validateCourseFinishMatrix} from './boat-score-2-course-finish-matrix.js';
export function parseLabelledCourseFinishRows(rows) {
 if(!Array.isArray(rows)||rows.length!==6)return {verified:false,reason:'six_course_rows_required'};
 const matrix=[];
 for(let course=1;course<=6;course++){
  const candidates=rows.filter(r=>r?.course===course);
  if(candidates.length!==1)return {verified:false,reason:'course_label_missing_or_duplicated',course};
  const row=candidates[0];
  if(!Array.isArray(row.finishCounts)||row.finishCounts.length!==6||
     row.finishCounts.some((cell,i)=>cell?.finish!==i+1||!Number.isInteger(cell.count)||cell.count<0))
   return {verified:false,reason:'finish_labels_or_counts_invalid',course};
  matrix.push({course,finishes:row.finishCounts.map(cell=>cell.count)});
 }
 const checked=validateCourseFinishMatrix(matrix);
 if(!checked.verified)return checked;
 const observed=matrix.flatMap(r=>r.finishes).reduce((a,b)=>a+b,0);
 return {verified:true,matrix,observed,
  note:'Labelled axes validated; source authenticity and sample period must be verified separately.'};
}
