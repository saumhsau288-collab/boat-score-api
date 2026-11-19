// Research-only parser: saved official result HTML, never pre-race authentication.
import fs from 'node:fs';
const ascii=s=>s.replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296));
export function parseSavedOfficialResultPages(report){
 if(!Array.isArray(report?.pages))throw Error('Expected pages[]');
 const rows=report.pages.map(p=>{
  const base={date:p.date,venue:p.venue,race:p.race,url:p.url,sha256:p.sha256??null,resultVerified:false,officialCutoffVerified:false};
  if(p.status!=='raw_html_saved'||typeof p.html!=='string')return {...base,status:'not_saved',reason:p.error??'No HTML'};
  const h=p.html,u=new URL(p.url);
  if(u.hostname!=='www.boatrace.jp'||u.pathname!=='/owpc/pc/race/raceresult'||
   u.searchParams.get('hd')!==String(p.date)||Number(u.searchParams.get('jcd'))!==Number(p.venue)||
   Number(u.searchParams.get('rno'))!==Number(p.race)||
   !h.includes('hd='+String(p.date))||!h.includes('jcd='+String(p.venue).padStart(2,'0')))
   return {...base,status:'needs_review',reason:'race_identity_unconfirmed'};
  const table=h.match(/<table\b[^>]*class="is-w495"[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if(!table||!/<th>着<\/th>/.test(table))return {...base,status:'needs_review',reason:'finish_table_missing'};
  const matches=[...table.matchAll(/<tr>\s*<td class="is-fs14">([^<]+)<\/td>\s*<td class="is-fs14 is-fBold is-boatColor([1-6])">([1-6])<\/td>/g)];
  const finishes=matches.map(m=>({rank:Number(ascii(m[1].trim())),boat:Number(m[3])}));
  const podium=finishes.filter(x=>x.rank>=1&&x.rank<=3).sort((a,b)=>a.rank-b.rank);
  if(podium.length!==3||podium.some((x,i)=>x.rank!==i+1)||new Set(podium.map(x=>x.boat)).size!==3)
   return {...base,status:'needs_review',reason:'podium_invalid'};
  // The finish table is the evidence needed for this phase; payout is irrelevant.
  // Keep the result unverified pending independent race-identity review.
  return {...base,status:'parsed_needs_independent_review',podium:podium.map(x=>x.boat)};
 });
 return {method:'official_html_parsed_not_independently_authenticated',rows,parsed:rows.filter(x=>x.status==='parsed_needs_independent_review').length,verifiedResults:0,eligibleForAccuracy:0};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const file=process.argv[2];if(!file)throw Error('Usage: node scripts/parse-saved-official-result-pages.mjs <raw-pages.json>');
 console.log(JSON.stringify(parseSavedOfficialResultPages(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
