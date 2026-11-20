// Build a conservative rectangular cell grid from one HTML table.
// Reject unsupported spans or conflicting occupied positions rather than shifting metrics.
export function buildOfficialTableGrid(table){
 if(typeof table!=='string'||table.length>2_000_000)return {valid:false,reason:'invalid_table'};
 const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
 const grid=[];
 for(let y=0;y<rows.length;y++){
  grid[y]??=[];
  const cells=[...rows[y].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
  let x=0;
  for(const m of cells){
   while(grid[y][x]!==undefined)x++;
   const attrs=m[2],attr=(name)=>{const z=attrs.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"(\\d+)"|\'(\\d+)\'|(\\d+))','i'));return z?Number(z[1]||z[2]||z[3]):1;};
   const width=attr('colspan'),height=attr('rowspan');
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>12||height>24)return {valid:false,reason:'invalid_span'};
   const cell={tag:m[1].toLowerCase(),html:m[3],originRow:y,originColumn:x};
   for(let dy=0;dy<height;dy++){
    grid[y+dy]??=[];
    for(let dx=0;dx<width;dx++){
     if(grid[y+dy][x+dx]!==undefined)return {valid:false,reason:'overlapping_spans'};
     grid[y+dy][x+dx]=cell;
    }
   }
   x+=width;
  }
 }
 const columns=Math.max(0,...grid.map(r=>r.length));
 if(grid.some(r=>r.length!==columns||r.some(v=>v===undefined)))return {valid:false,reason:'nonrectangular_grid'};
 return {valid:true,rows:grid,columns,rowCount:grid.length};
}
