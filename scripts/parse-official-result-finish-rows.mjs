// Conservative parser for the official "着 / 枠 / ボートレーサー / レースタイム" table.
// Supports full-width Japanese finish digits and direct four-digit racer numbers.
// Parsed structure is not independently authenticated source evidence.
export function parseOfficialResultFinishRows(html){
 const reject=(reason,candidateRows=0)=>({verified:false,reason,candidateRows,finishByBoat:[]});
 if(typeof html!=='string'||!html.length||Buffer.byteLength(html,'utf8')>2_000_000)return reject('invalid_html');
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]);
 const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim().normalize('NFKC');
 const candidates=[];
 for(const table of tables){
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
  if(rows.length!==7)continue;
  const headings=[...rows[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>plain(m[1]));
  if(headings.length!==4||headings[0]!=='着'||headings[1]!=='枠'||
   !headings[2].includes('ボートレーサー')||!headings[3].includes('レースタイム'))continue;
  const entries=[];
  for(const row of rows.slice(1)){
   const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
   if(cells.length!==4)break;
   const finish=plain(cells[0]),boat=plain(cells[1]);
   if(!/^[1-6]$/.test(finish)||!/^[1-6]$/.test(boat))break;
   const racerCell=plain(cells[2]);
   const idMatch=racerCell.match(/^(\d{4})(?=\s|$)/);
   if(!idMatch)break;
   entries.push({boat:Number(boat),finish:Number(finish),racerId:idMatch[1]});
  }
  if(entries.length===6&&new Set(entries.map(x=>x.boat)).size===6&&
   new Set(entries.map(x=>x.finish)).size===6&&new Set(entries.map(x=>x.racerId)).size===6)
   candidates.push(entries.sort((a,b)=>a.boat-b.boat));
 }
 if(candidates.length!==1)return reject(candidates.length?'ambiguous_result_tables':'no_complete_six_racer_result_table',candidates.length);
 return {verified:true,reason:null,candidateRows:6,finishByBoat:candidates[0]};
}
