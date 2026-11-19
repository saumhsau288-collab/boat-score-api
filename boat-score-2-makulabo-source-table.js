// Read-only extraction from Makulabo's labelled HTML table; no production changes.
import {annotateMakulaboFinishRows} from './boat-score-2-makulabo-finish-headers.js';
const clean=s=>String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
export function extractMakulaboFinishTable(html) {
 if(typeof html!=='string')return {verified:false,reason:'invalid_html'};
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
 for(const table of tables){
  const tr=[...table[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>m[0]);
  const cells=tr.map(row=>[...row.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>clean(m[2])));
  const headerIndex=cells.findIndex(row=>row.length===10 && row[0]==='枠' && row[1]==='選手');
  if(headerIndex<0)continue;
  const rows=cells.slice(headerIndex+1).filter(row=>row.length===10);
  const parsed=annotateMakulaboFinishRows(cells[headerIndex],rows);
  if(!parsed.verified)return parsed;
  if(parsed.rows.length!==6 || new Set(parsed.rows.map(r=>r.boat)).size!==6 ||
    parsed.rows.some(r=>!r.name.trim()) ||
    parsed.rows.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6))
   return {verified:false,reason:'six_distinct_boats_required'};
  return {verified:true,headers:cells[headerIndex],rows,parsedRows:parsed.rows};
 }
 return {verified:false,reason:'labelled_table_not_found'};
}
