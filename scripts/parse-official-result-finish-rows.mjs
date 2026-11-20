// Conservative official result parser: accepts only one unambiguous six-row table.
// Finish position must be an explicit first cell; boat number explicit second cell.
// Racer identity must be a single official profile link in the same row.
export function parseOfficialResultFinishRows(html){
 const reject=(reason,candidateRows=0)=>({verified:false,reason,candidateRows,finishByBoat:[]});
 if(typeof html!=='string'||!html.length||Buffer.byteLength(html,'utf8')>2_000_000)return reject('invalid_html');
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]);
 const candidates=[];
 for(const table of tables){
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
  const entries=[];
  for(const row of rows){
   const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
   if(cells.length<3)continue;
   const plain=cell=>cell.replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').trim();
   const finish=plain(cells[0]),boat=plain(cells[1]);
   if(!/^[1-6]$/.test(finish)||!/^[1-6]$/.test(boat))continue;
   const links=[...row.matchAll(/<a\b[^>]*href=["']([^"']*racersearch\/profile\?[^"']*)["'][^>]*>/gi)];
   if(links.length!==1)continue;
   let racerId=null;
   try{const u=new URL(links[0][1],'https://www.boatrace.jp');racerId=u.searchParams.get('toban');}catch{}
   if(!/^\d{4}$/.test(racerId||''))continue;
   entries.push({boat:Number(boat),finish:Number(finish),racerId});
  }
  if(entries.length===6&&new Set(entries.map(v=>v.boat)).size===6&&
   new Set(entries.map(v=>v.finish)).size===6&&new Set(entries.map(v=>v.racerId)).size===6)
   candidates.push(entries.sort((a,b)=>a.boat-b.boat));
 }
 if(candidates.length!==1)return reject(candidates.length?'ambiguous_result_tables':'no_complete_six_racer_result_table',candidates.length);
 return {verified:true,reason:null,candidateRows:6,finishByBoat:candidates[0]};
}
