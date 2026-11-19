import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLabelledCourseFinishRows} from './boat-score-2-makulabo-labelled-matrix.js';
const rows=Array.from({length:6},(_,i)=>({course:i+1,finishCounts:Array.from({length:6},(_,j)=>({finish:j+1,count:i===3&&j===0?4:0}))}));
test('accepts explicit course and finish labels even when rows are reversed',()=>{
 const result=parseLabelledCourseFinishRows([...rows].reverse());
 assert.equal(result.verified,true);
 assert.equal(result.matrix[3].finishes[0],4);
 assert.equal(result.observed,4);
});
test('rejects missing and duplicated course labels',()=>{
 assert.equal(parseLabelledCourseFinishRows(rows.slice(1)).verified,false);
 const dup=rows.map(r=>({...r}));dup[0].course=2;
 assert.equal(parseLabelledCourseFinishRows(dup).reason,'course_label_missing_or_duplicated');
});
test('rejects mislabelled finish columns and negative counts',()=>{
 const wrong=rows.map(r=>({...r,finishCounts:r.finishCounts.map(c=>({...c}))}));
 wrong[3].finishCounts[0].finish=2;
 assert.equal(parseLabelledCourseFinishRows(wrong).reason,'finish_labels_or_counts_invalid');
 wrong[3].finishCounts[0]={finish:1,count:-1};
 assert.equal(parseLabelledCourseFinishRows(wrong).reason,'finish_labels_or_counts_invalid');
});
