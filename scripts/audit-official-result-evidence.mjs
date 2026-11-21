// Offline research-only inspection of independent official result evidence.
export function auditOfficialResultEvidence(results){
 if(!Array.isArray(results))throw Error('results_array_required');
 const seen=new Map();const rows=[];
 for(const [index,row] of results.entries()){
  const date=String(row?.date??''),venue=Number(row?.venue),race=Number(row?.race);
  const y=Number(date.slice(0,4)),m=Number(date.slice(4,6)),d=Number(date.slice(6,8));
  const dateValid=/^20\d{6}$/.test(date)&&m>=1&&m<=12&&d>=1&&d<=31&&
   new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===
   date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8);
  const validKey=dateValid&&Number.isInteger(venue)&&venue>=1&&venue<=24&&
   Number.isInteger(race)&&race>=1&&race<=12;
  const key=validKey?[date,venue,race].join(':'):null;
  if(key)seen.set(key,(seen.get(key)||0)+1);
  const reasons=[];
  if(!validKey)reasons.push('invalid_race_key');
  if(row?.verified!==true)reasons.push('result_not_independently_verified');
  if(!Array.isArray(row?.finishOrder)||row.finishOrder.length!==6||
   new Set(row.finishOrder).size!==6||
   row.finishOrder.some(n=>!Number.isInteger(n)||n<1||n>6))
   reasons.push('invalid_six_boat_finish_order');
  try{
   const u=new URL(row?.sourceUrl);
   if(u.protocol!=='https:'||u.hostname!=='www.boatrace.jp'||u.pathname!=='/owpc/pc/race/raceresult'||
    u.username||u.password||u.port||u.hash||!validKey||
    ['hd','jcd','rno'].some(k=>u.searchParams.getAll(k).length!==1)||
    u.searchParams.get('hd')!==date||Number(u.searchParams.get('jcd'))!==venue||
    Number(u.searchParams.get('rno'))!==race)
    reasons.push('official_result_url_mismatch');
  }catch{reasons.push('missing_official_result_url');}
  rows.push({index,date,venue:row?.venue,race:row?.race,key,reasons});
 }
 for(const row of rows)if(row.key&&seen.get(row.key)>1)row.reasons.push('duplicate_official_result_key');
 return {scope:'OFFICIAL_RESULT_EVIDENCE_STRUCTURAL_AUDIT',
  inspected:rows.length,structurallyValid:rows.filter(r=>r.reasons.length===0).length,
  held:rows.filter(r=>r.reasons.length>0).length,rows,
  independentlyAuthenticated:false,eligibleForCalibration:false,
  warning:'Structural validation cannot establish that verified=true is truthful; source content and official deadline require independent authentication.'};
}
