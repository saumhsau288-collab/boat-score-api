// Summarize only attempted captures. Null slots represent tasks never started.
export function summarizeCaptureRows(rows){
 const records=rows.filter(Boolean);
 return {records,attempted:records.length,httpSuccess:records.filter(r=>r.httpStatus===200).length,ready:records.filter(r=>r.response?.ready===true).length};
}
