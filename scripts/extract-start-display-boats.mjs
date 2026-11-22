// Research-only: extract the ordered start-display boat numbers and ST labels.
// Order is NOT certified as actual entry course; no course mapping is emitted.
export function extractStartDisplayBoats(html){
 if(typeof html!=='string')return {status:'invalid_html'};
 const section=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(x=>x[1]).find(x=>x.includes('スタート展示')&&x.includes('table1_boatImage1Number'));
 if(!section)return {status:'missing_start_display'};
 const cells=[...section.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1]).filter(x=>x.includes('table1_boatImage1Number'));
 if(cells.length!==6)return {status:'not_six_start_display_cells',count:cells.length};
 const boats=[];
 for(const cell of cells){
  const boat=cell.match(/class="[^"]*table1_boatImage1Number[^"]*"[^>]*>\s*([1-6])\s*<\/span>/);
  const timing=cell.match(/class="[^"]*table1_boatImage1Time[^"]*"[^>]*>\s*(F?\.?\d{1,2})\s*<\/span>/);
  if(!boat||!timing)return {status:'unparsed_start_display_cell'};
  boats.push({boat:Number(boat[1]),startDisplayST:timing[1],displayPosition:boats.length+1});
 }
 if(new Set(boats.map(x=>x.boat)).size!==6)return {status:'duplicate_boats'};
 return {status:'parsed_start_display',boats,actualEntryCourseVerified:false};
}
