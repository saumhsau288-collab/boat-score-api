// Summarize only attempted captures. Null slots represent tasks never started.
export function summarizeCaptureRows(rows,{planned=rows.length,stoppedForOfficial403=false}={}){
 const records=rows.filter(Boolean);
 const attempted=records.length;
 if(!Number.isInteger(planned)||planned<attempted)throw new Error('Invalid planned count');
 const unattempted=planned-attempted;
 return {records,attempted,planned,unattempted,stoppedForOfficial403,
  httpSuccess:records.filter(r=>r.httpStatus===200).length,
  ready:records.filter(r=>r.response?.ready===true).length,
  stopReason:stoppedForOfficial403?'consecutive_official_http_403':null};
}
