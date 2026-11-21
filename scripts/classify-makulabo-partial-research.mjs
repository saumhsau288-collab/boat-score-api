// Research-only: distinguish missing Makulabo rows from zero-valued performance.
// Does not alter the six-racer scoring or production join.
const normalize=s=>String(s??'').replace(/\s+/g,'').replace(/[１２３４５６]/g,c=>String('１２３４５６'.indexOf(c)+1));
const headers=['枠','選手','1着','2着','3着','4着','5着','6着','走','平均'];
export function classifyMakulaboFinishRows(rawHeaders,rawRows){
 if(!Array.isArray(rawHeaders)||rawHeaders.length!==10||!headers.every((h,i)=>normalize(rawHeaders[i])===h))
  return {status:'held',reason:'unverified_headers',valid:[],missing:[],invalid:[]};
 if(!Array.isArray(rawRows)||rawRows.length!==6)
  return {status:'held',reason:'six_rows_required',valid:[],missing:[],invalid:[]};
 const valid=[],missing=[],invalid=[],zeroRuns=[],seen=new Set();
 for(const row of rawRows){
  if(!Array.isArray(row)||row.length!==10)return {status:'held',reason:'invalid_row_width',valid:[],missing:[],invalid:[]};
  const boat=Number(normalize(row[0])),name=String(row[1]??'').trim();
  if(!Number.isInteger(boat)||boat<1||boat>6||seen.has(boat)||!name)
   return {status:'held',reason:'invalid_boat_or_name',valid:[],missing:[],invalid:[]};
  seen.add(boat);
  const tokens=row.slice(2,9).map(s=>String(s??'').trim());
  // All seven numeric cells absent: unknown sample size, NOT zero runs.
  if(tokens.every(t=>t==='—'||t==='–'||t==='-')){
   missing.push({boat,name,reason:'all_counts_and_runs_missing',runs:null});continue;
  }
  if(tokens.some(t=>!/^[0-9]+$/.test(t))){
   invalid.push({boat,name,reason:'mixed_or_non_numeric_cells'});continue;
  }
  const counts=tokens.slice(0,6).map(Number),runs=Number(tokens[6]);
  if(counts.reduce((a,b)=>a+b,0)!==runs){
   invalid.push({boat,name,reason:'invalid_finish_totals'});continue;
  }
  if(runs===0){zeroRuns.push({boat,name,runs:0,firstPlaceRate:null,reason:'zero_sample_rate_undefined'});continue;}
  valid.push({boat,name,counts,runs,firstPlaceRate:+(100*counts[0]/runs).toFixed(2)});
 }
 return {status:invalid.length?'partial_with_invalid':(missing.length||zeroRuns.length)?'partial_with_unscorable':'all_rows_valid',
  valid,missing,invalid,zeroRuns,eligibleForCalibration:false,scoreChangeApplied:false};
}
