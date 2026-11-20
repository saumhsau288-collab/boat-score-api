// Research-only: require a unique boat and racer profile in each of six grid rows.
import {identifyOfficialGroupedMetricColumns} from './identify-official-grouped-metric-columns.mjs';
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const number=s=>{const t=clean(s).replace(/[%％]/g,'');return /^\d+(?:\.\d+)?$/.test(t)?Number(t):null;};
// A stacked official cell must have exactly three numeric entries in header order.
// Reject extra or missing values rather than shifting the percentage index.
const stackedValues=s=>{const t=clean(s).replace(/[%％]/g,'');return /^\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?){2}$/.test(t)?t.split(/\s+/).map(Number):null;};
export function extractGroupedOfficialSix(html){
 const tables=typeof html==='string'?[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]):[];
 if(tables.length!==1){
  const attempts=tables.map(t=>extractGroupedOfficialSix(t));
  const results=attempts.filter(r=>r.verified);
  return results.length===1?results[0]:{verified:false,reason:results.length?'multiple_verified_grouped_tables':'no_verified_grouped_table',racers:[],
   tableAttempts:attempts.map((a,i)=>({index:i,verified:a.verified,reason:a.reason??null,candidateRows:a.candidateRows??0,columns:a.columns??null}))};
 }
 const layout=identifyOfficialGroupedMetricColumns(html);
 if(!layout.verified)return {verified:false,reason:layout.reason,racers:[],columns:layout.candidates??null};
 const {grid,columns}=layout,found=[];
 for(const row of grid.rows){
  if(row.every(c=>c.tag==='th'))continue;
  const boats=row.slice(0,1).filter(c=>c.originRow===grid.rows.indexOf(row)&&/^[1-6]$/.test(clean(c.html)));
  // Never infer the boat from row order or from an arbitrary numeric statistic.
  if(boats.length!==1)continue;
  const boat=number(boats[0].html);
  const links=[...new Set(row.flatMap(c=>[...c.html.matchAll(/<a\\b[^>]*href=["']([^"']*racersearch\\/profile\\?[^"']*)["'][^>]*>([\\s\\S]*?)<\\/a>/gi)].map(m=>m[0])))];
  const profiles=links.map(link=>{
   const m=link.match(/<a\\b[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/i);
   if(!m)return null;
   try{
    const id=new URL(m[1],'https://www.boatrace.jp').searchParams.get('toban');
    return /^\\d{4}$/.test(id||'')?{id,name:clean(m[2])}:null;
   }catch{return null;}
  }).filter(Boolean);
  const ids=[...new Set(profiles.map(p=>p.id))];
  const names=[...new Set(profiles.map(p=>p.name).filter(Boolean))];
  if(ids.length!==1||names.length!==1)continue;
  const id=ids[0],name=names[0];
  let values;
  if(layout.mode==='stacked_triplet'){
   const national=stackedValues(row[columns.nationalWinRate]?.html);
   const local=stackedValues(row[columns.localWinRate]?.html);
   const motor=stackedValues(row[columns.motorTwoWinRate]?.html);
   if(!national||!local||!motor)continue;
   values={nationalWinRate:national[0],localWinRate:local[0],motorTwoWinRate:motor[1]};
  }else{
   values=Object.fromEntries(Object.entries(columns).map(([key,col])=>[key,number(row[col]?.html)]));
  }
  if(!name||values.nationalWinRate===null||values.localWinRate===null||values.motorTwoWinRate===null||
   values.nationalWinRate>10||values.localWinRate>10||values.motorTwoWinRate>100)continue;
  found.push({boat,racerId:id,name,...values,sourceVerified:true});
 }
 if(found.length!==6||new Set(found.map(r=>r.boat)).size!==6||new Set(found.map(r=>r.racerId)).size!==6)
  return {verified:false,reason:'six_unique_grouped_racer_rows_required',racers:[],candidateRows:found.length};
 return {verified:true,racers:found.sort((a,b)=>a.boat-b.boat),source:'official_grouped_html_table'};
}
