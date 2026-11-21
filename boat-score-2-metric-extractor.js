// Conservative extraction of racer metrics from official HTML tables.
// Only accept a table when header labels and boat/racer mapping are explicit.
import {parseOfficialBoatRows} from './boat-score-2-boat-mapping.js';
import {extractGroupedOfficialSix} from './scripts/extract-grouped-official-six.mjs';
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const num=s=>{const v=clean(s).replace(/％|%/g,'');return /^\d+(?:\.\d+)?$/.test(v)?Number(v):null;};
export function extractOfficialMetrics(html){
 if(typeof html!=='string'||html.length>2_000_000)
  return {verified:false,reason:'invalid_html',racers:[]};
 // Prefer verified merged-cell layout when the live page uses grouped headers.
 const grouped=extractGroupedOfficialSix(html);
 if(grouped.verified)return {verified:true,racers:grouped.racers,source:grouped.source};
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]);
 const diagnostics={tableCount:tables.length,matchingHeaderTables:0,matchingMappedTables:0,candidateMetricRows:0,
  groupedHeaderTables:0,groupedHeaderLabels:[],
  tablesWithRowspan:0,tablesWithColspan:0,tableRowCounts:[],tableSamples:[]};
 for(const table of tables){
  if(/<t[dh]\b[^>]*\browspan\s*=/i.test(table))diagnostics.tablesWithRowspan++;
  if(/<t[dh]\b[^>]*\bcolspan\s*=/i.test(table))diagnostics.tablesWithColspan++;
  diagnostics.tableRowCounts.push((table.match(/<tr\b/gi)||[]).length);
  const sampleRows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].slice(0,5);
  diagnostics.tableSamples.push(sampleRows.map(m=>({
    thCount:(m[1].match(/<th\b/gi)||[]).length,
    tdCount:(m[1].match(/<td\b/gi)||[]).length,
    racerLinks:(m[1].match(/racersearch\/profile\?/gi)||[]).length,
    rowspans:(m[1].match(/rowspan\s*=/gi)||[]).length,
    colspans:(m[1].match(/colspan\s*=/gi)||[]).length
  })));
  const headers=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1]));
  const find=regex=>headers.findIndex(h=>regex.test(h));
  // Official racelists can use grouped headers 全国 / 当地 / モーター,
  // followed by subheaders 勝率 / 2連率. Flag this layout; do not
  // guess rowspan/colspan offsets or silently read the wrong metric.
  if(headers.some(h=>h==='全国')&&headers.some(h=>h==='当地')&&headers.some(h=>h==='モーター')){
   diagnostics.groupedHeaderTables++;
   diagnostics.groupedHeaderLabels=['全国','当地','モーター'];
  }
  const boatIdx=find(/^(?:枠|艇番|枠番)$/);
  const nationalIdx=find(/全国.*勝率/),localIdx=find(/当地.*勝率/);
  const motorIdx=find(/モーター.*(?:2連対率|2連率)/);
  if([boatIdx,nationalIdx,localIdx,motorIdx].some(i=>i<0))continue;
  diagnostics.matchingHeaderTables++;
  // Require header positions to be the same as cell positions in every row.
  const mapped=parseOfficialBoatRows(table);
  if(!mapped.verified)continue;
  diagnostics.matchingMappedTables++;
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
   diagnostics.candidateMetricRows++;
  }
  if(metrics.length===6&&new Set(metrics.map(r=>r.boat)).size===6)
   return {verified:true,racers:metrics.sort((a,b)=>a.boat-b.boat),source:'official_html_table'};
 }
 return {verified:false,reason:diagnostics.groupedHeaderTables&&!diagnostics.matchingHeaderTables?
  'grouped_official_headers_need_verified_column_mapping':'metric_table_not_verified',racers:[],diagnostics};
}
