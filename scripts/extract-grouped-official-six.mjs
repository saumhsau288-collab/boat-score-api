// Research-only: require a unique boat and racer profile in each of six grid rows.
import {identifyOfficialGroupedMetricColumns} from './identify-official-grouped-metric-columns.mjs';
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const number=s=>{const t=clean(s).replace(/[%％]/g,'');return /^\d+(?:\.\d+)?$/.test(t)?Number(t):null;};
export function extractGroupedOfficialSix(html){
 const tables=typeof html==='string'?[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]):[];
 if(tables.length!==1){
  const results=tables.map(t=>extractGroupedOfficialSix(t)).filter(r=>r.verified);
  return results.length===1?results[0]:{verified:false,reason:results.length?'multiple_verified_grouped_tables':'no_verified_grouped_table',racers:[]};
 }
 const layout=identifyOfficialGroupedMetricColumns(html);
 if(!layout.verified)return {verified:false,reason:layout.reason,racers:[]};
 const {grid,columns}=layout,found=[];
 for(const row of grid.rows){
  if(row.every(c=>c.tag==='th'))continue;
  const boats=row.slice(0,1).filter(c=>c.originRow===grid.rows.indexOf(row)&&/^[1-6]$/.test(clean(c.html)));
  // Never infer the boat from row order or from an arbitrary numeric statistic.
  if(boats.length!==1)continue;
  const boat=number(boats[0].html);
  const links=[...new Set(row.flatMap(c=>[...c.html.matchAll(/<a\b[^>]*href=["']([^"']*racersearch\/profile\?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>m[0])))];
  if(links.length!==1)continue;
  const m=links[0].match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  let id;
  try{id=new URL(m[1],'https://www.boatrace.jp').searchParams.get('toban');}catch{continue;}
  if(!/^\d{4}$/.test(id||''))continue;
  const name=clean(m[2]);
  const values=Object.fromEntries(Object.entries(columns).map(([key,col])=>[key,number(row[col]?.html)]));
  if(!name||values.nationalWinRate===null||values.localWinRate===null||values.motorTwoWinRate===null||
   values.nationalWinRate>10||values.localWinRate>10||values.motorTwoWinRate>100)continue;
  found.push({boat,racerId:id,name,...values,sourceVerified:true});
 }
 if(found.length!==6||new Set(found.map(r=>r.boat)).size!==6||new Set(found.map(r=>r.racerId)).size!==6)
  return {verified:false,reason:'six_unique_grouped_racer_rows_required',racers:[],candidateRows:found.length};
 return {verified:true,racers:found.sort((a,b)=>a.boat-b.boat),source:'official_grouped_html_table'};
}
