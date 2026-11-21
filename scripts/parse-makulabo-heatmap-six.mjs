// Research-only: parse six explicitly labelled Makulabo finish-count rows.
// Does not assert provenance, recent-50 coverage, or eligibility for scoring.
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const cells=(row,tag)=>[...row.matchAll(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'>','gi'))].map(m=>clean(m[1]));
export function parseMakulaboHeatmapSix(html){
 if(typeof html!=='string'||html.length>2_000_000)return {verified:false,reason:'invalid_html',racers:[]};
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
 const valid=[];
 for(const table of tables){
  const rows=[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>m[0]);
  const headers=rows.filter(r=>/<th\b/i.test(r)).map(r=>cells(r,'th'));
  if(headers.length!==1)continue;
  const labels=headers[0].map(s=>s.replace(/\s+/g,''));
  if(JSON.stringify(labels.slice(0,10))!==JSON.stringify(['枠','選手','1着','2着','3着','4着','5着','6着','走','平均']))continue;
  const data=rows.filter(r=>/<td\b/i.test(r));
  if(data.length!==6)continue;
  const racers=[];
  for(const row of data){
   const values=cells(row,'td');
   if(values.length!==10)break;
   const [boatText,name,...rest]=values;
   const boat=Number(boatText.normalize('NFKC'));
   if(!/^[1-6]$/.test(boatText.normalize('NFKC'))||!name)break;
   const nums=rest.slice(0,7).map(x=>/^\d+$/.test(x)?Number(x):null);
   const average=rest[7];
   if(nums.some(x=>x===null)||!/^(?:\d+)(?:\.\d+)?$/.test(average))break;
   const counts=nums.slice(0,6),runs=nums[6];
   if(runs<1||runs>50||counts.reduce((a,b)=>a+b,0)!==runs)break;
   racers.push({boat,name,counts,runs,averageFinish:Number(average),
    firstPlaceRate:Math.round(counts[0]/runs*10000)/100,
    finishHeadersVerified:true,sourceVerified:false,eligibleAsVerifiedRecent50:false});
  }
  if(racers.length===6&&new Set(racers.map(r=>r.boat)).size===6)
   valid.push(racers.sort((a,b)=>a.boat-b.boat));
 }
 return valid.length===1?{verified:true,racers:valid[0],reason:null,
  warning:'Source structure verified, but racer identity, provenance, cutoff and scoring eligibility are not verified.'}:
  {verified:false,reason:valid.length?'ambiguous_heatmap_tables':'six_valid_heatmap_rows_required',racers:[]};
}
