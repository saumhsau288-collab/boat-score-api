// Research-only check for raw Makulabo heatmap rows; never infer last50 win rate.
export function auditHeatmapZeroSubstitution(html){
 if(typeof html!=='string')throw Error('Expected raw HTML string');
 const rows=[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(x=>x[0]);
 const out={totalRows:rows.length,rowsWithBlankCells:0,blankCellCount:0,rowsWithLiteralZero:0,
  rowsWithNonNumericCells:0,eligibleForLast50Scoring:false,issues:[],
  warning:'Blank cells are not observed zero counts. Heatmap counts alone do not establish a verified recent50 first-place rate.'};
 for(const row of rows){
  const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1].replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;|&#xA0;/gi,' ').trim());
  if(!cells.length)continue;
  const blank=cells.filter(x=>x==='').length;
  if(blank){out.rowsWithBlankCells++;out.blankCellCount+=blank;}
  if(cells.some(x=>x==='0'))out.rowsWithLiteralZero++;
  if(cells.some(x=>x!==''&&!/^\d+(?:\.\d+)?$/.test(x)))out.rowsWithNonNumericCells++;
 }
 if(out.blankCellCount)out.issues.push('blank_cells_require_missing_value_handling');
 out.issues.push('heatmap_is_not_verified_recent50_rate');
 return out;
}
