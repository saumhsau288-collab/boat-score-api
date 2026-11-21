// Research-only conservative mapping of official racelist boat numbers to racers.
// Official rows can contain two profile links (photo + name) for the same racer.
const clean = value => String(value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
export function parseOfficialBoatRows(html) {
 if (typeof html !== 'string' || html.length > 2_000_000)
  return {verified:false,racers:[],reason:'invalid_html'};
 const rows=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
 const entries=[];
 for (const row of rows) {
  const cells=[...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
  if (cells.length<2) continue;
  const first=clean(cells[0][2]).normalize('NFKC');
  if (!/^[1-6]$/.test(first)) continue;
  const boat=Number(first);
  const boatColor=cells[0][1].match(/\bis-boatColor([1-6])\b/i);
  if (boatColor && Number(boatColor[1])!==boat) continue;
  // Only inspect identity cells, not historical result links in later columns.
  const identityHtml=cells.slice(1,4).map(c=>c[2]).join(' ');
  const links=[...identityHtml.matchAll(/<a\b[^>]*href=["']([^"']*racersearch\/profile\?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const profiles=links.map(link=>{
   try {
    const id=new URL(link[1],'https://www.boatrace.jp').searchParams.get('toban');
    return /^\d{4}$/.test(id||'')?{id,name:clean(link[2])}:null;
   } catch {return null;}
  }).filter(Boolean);
  const ids=[...new Set(profiles.map(p=>p.id))];
  const names=[...new Set(profiles.map(p=>p.name).filter(Boolean))];
  if(ids.length!==1 || names.length!==1) continue;
  entries.push({boat,racerId:ids[0],name:names[0]});
 }
 const boats=new Set(entries.map(e=>e.boat)),ids=new Set(entries.map(e=>e.racerId));
 const verified=entries.length===6&&boats.size===6&&ids.size===6;
 return {verified,racers:verified?entries.sort((a,b)=>a.boat-b.boat):[],
  reason:verified?null:'boat_row_mapping_not_verified',candidateRows:entries.length};
}
