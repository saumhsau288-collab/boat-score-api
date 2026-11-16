// Conservative extraction of racer metrics from official HTML tables.
// Only accept a table when header labels and boat/racer mapping are explicit.
import {parseOfficialBoatRows} from './boat-score-2-boat-mapping.js';
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const num=s=>{const v=clean(s).replace(/％|%/g,'');return /^\d+(?:\.\d+)?$/.test(v)?Number(v):null;};
export function extractOfficialMetrics(html){
 if(typeof html!=='string'||html.length>2_000_000)
  return {verified:false,reason:'invalid_html',racers:[]};
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]);
 for(const table of tables){
  const headers=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1]));
  const find=regex=>headers.findIndex(h=>regex.test(h));
  const boatIdx=find(/^(?:枠|艇番|枠番)$/);
  const nationalIdx=find(/全国.*勝率/),localIdx=find(/当地.*勝率/);
  const motorIdx=find(/モーター.*(?:2連対率|2連率)/);
  if([boatIdx,nationalIdx,localIdx,motorIdx].some(i=>i<0))continue;
  // Require header positions to be the same as cell positions in every row.
  const mapped=parseOfficialBoatRows(table);
  if(!mapped.verified)continue;
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
  const metrics=[];
  for(const row of rows){
   const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
   if(cells.length<=Math.max(boatIdx,nationalIdx,localIdx,motorIdx))continue;
   const boat=num(cells[boatIdx]);
   const identity=mapped.racers.find(r=>r.boat===boat);
   if(!identity)continue;
   const values={nationalWinRate:num(cells[nationalIdx]),localWinRate:num(cells[localIdx]),motorTwoWinRate:num(cells[motorIdx])};
   if(Object.values(values).some(v=>v===null))continue;
   metrics.push({...identity,...values,sourceVerified:true});
  }
  if(metrics.length===6&&new Set(metrics.map(r=>r.boat)).size===6)
   return {verified:true,racers:metrics.sort((a,b)=>a.boat-b.boat),source:'official_html_table'};
 }
 return {verified:false,reason:'metric_table_not_verified',racers:[]};
}
