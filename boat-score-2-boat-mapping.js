// Conservative extraction of boat-to-racer assignments from official racelist rows.
// Accept only rows with an explicit first-cell boat number and exactly one racer link.
// This intentionally rejects unknown HTML layouts rather than guessing assignments.
export function parseOfficialBoatRows(html) {
 if(typeof html!=='string'||html.length>2_000_000)
   return {verified:false,racers:[],reason:'invalid_html'};
 const rows=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
 const entries=[];
 for(const row of rows){
   const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
   if(cells.length<2)continue;
   const first=cells[0].replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').trim().normalize('NFKC');
   if(!/^[1-6]$/.test(first))continue;
   const links=[...row.matchAll(/<a\b[^>]*href=["']([^"']*racersearch\/profile\?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
   const profiles=links.map(link=>{
     try{return {id:new URL(link[1],'https://www.boatrace.jp').searchParams.get('toban'),name:link[2].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()};}catch{return null;}
   }).filter(Boolean);
   const ids=[...new Set(profiles.map(p=>p.id))];
   const names=[...new Set(profiles.map(p=>p.name).filter(Boolean))];
   if(ids.length!==1||!/^\d{4}$/.test(ids[0]||'')||names.length!==1)continue;
   const racerId=ids[0],name=names[0];
   entries.push({boat:Number(first),racerId,name});
 }
 const boats=new Set(entries.map(e=>e.boat)),ids=new Set(entries.map(e=>e.racerId));
 const verified=entries.length===6&&boats.size===6&&ids.size===6;
 return {verified,racers:verified?entries.sort((a,b)=>a.boat-b.boat):[],
   reason:verified?null:'boat_row_mapping_not_verified',candidateRows:entries.length};
}
