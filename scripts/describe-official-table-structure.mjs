// Research-only structural trace. Never retain racer names, identifiers or numerical metrics.
import {buildOfficialTableGrid} from './build-official-table-grid.mjs';
import {identifyOfficialGroupedMetricColumns} from './identify-official-grouped-metric-columns.mjs';
const labels=['枠','艇番','枠番','選手','全国','当地','モーター','勝率','2連率','2連対率','番号'];
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
export function describeOfficialTableStructure(html){
 if(typeof html!=='string'||html.length>2_000_000)return [];
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]).slice(0,20);
 return tables.map((table,index)=>{
  const grid=buildOfficialTableGrid(table);
  const mapping=identifyOfficialGroupedMetricColumns(table);
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
  const thPerRow=rows.map(row=>(row.match(/<th\b/gi)||[]).length);
  const tdPerRow=rows.map(row=>(row.match(/<td\b/gi)||[]).length);
  const profileLinksPerRow=rows.map(row=>(row.match(/racersearch\/profile\?/gi)||[]).length);
  const spanMaxPerRow=rows.map(row=>{
   const spans=[...row.matchAll(/\b(?:rowspan|colspan)\s*=\s*["']?(\d+)/gi)].map(m=>Number(m[1]));
   return spans.length?Math.max(...spans):1;
  });
  const headerCellsByRow=rows.slice(0,3).map(row=>[...row.matchAll(/<th\b([^>]*)>([\s\S]*?)<\/th>/gi)].map(m=>({
   label:clean(m[2]).slice(0,48),
   colspan:Number(m[1].match(/\bcolspan\s*=\s*["']?(\d+)/i)?.[1]??1),
   rowspan:Number(m[1].match(/\browspan\s*=\s*["']?(\d+)/i)?.[1]??1)
  })));
  const headerLabels=[...new Set([...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>clean(m[1])).filter(s=>labels.includes(s)))];
  return {index,rowCount:rows.length,headerCellsPerRow:thPerRow.slice(0,32),dataCellsPerRow:tdPerRow.slice(0,32),
   profileLinksPerRow:profileLinksPerRow.slice(0,32),
   spanMaxPerRow:spanMaxPerRow.slice(0,32),
   profileLinkCount:(table.match(/racersearch\/profile\?/gi)||[]).length,
   visibleHeaderLabels:headerLabels,gridValid:grid.valid,gridReason:grid.reason??null,
   gridColumnCount:grid.valid?grid.columns:null,
   mappingVerified:mapping.verified,mappingReason:mapping.reason??null,
   mappingCandidates:mapping.candidates??null,
   headerGridLabels:mapping.headerGridLabels??null,
   headerCellsByRow};
 });
}
