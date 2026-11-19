// Research-only validation of Makulabo table headers. Never infer column order from counts.
const EXPECTED=['枠','選手','1着','2着','3着','4着','5着','6着','走','平均'];
const normalize=s=>String(s??'').replace(/\s+/g,'').replace(/[１２３４５６]/g,c=>String('１２３４５６'.indexOf(c)+1));
export function verifyMakulaboFinishHeaders(headers) {
 if(!Array.isArray(headers)||headers.length!==EXPECTED.length)return false;
 return EXPECTED.every((label,i)=>normalize(headers[i])===label);
}
export function annotateMakulaboFinishRows(headers,rows) {
 if(!verifyMakulaboFinishHeaders(headers)||!Array.isArray(rows))
  return {verified:false,reason:'unverified_finish_headers',rows:[]};
 const output=[];
 for(const row of rows){
  if(!Array.isArray(row)||row.length!==EXPECTED.length)return {verified:false,reason:'invalid_row_width',rows:[]};
  const counts=row.slice(2,8).map(s=>String(s??'').trim()===''?0:Number(s));
  const runs=Number(row[8]);
  if(counts.some(n=>!Number.isInteger(n)||n<0)||!Number.isInteger(runs)||runs<0||counts.reduce((a,b)=>a+b,0)!==runs)
   return {verified:false,reason:'invalid_finish_totals',rows:[]};
  output.push({boat:Number(row[0]),name:String(row[1]),counts,runs,finishHeadersVerified:true});
 }
 return {verified:true,reason:null,rows:output};
}
