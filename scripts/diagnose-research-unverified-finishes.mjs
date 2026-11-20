// Diagnose why strict six-boat finish verification fails without fabricating a result.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const result=JSON.parse(await fs.readFile(path.join(dir,'official-verified-finishing-orders.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(dir,'official-result-page-availability.json'),'utf8'));
const decode=s=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const rows=[];
for(const r of result.rows.filter(x=>!x.finishVerified)){
 const item=manifest.rows.find(x=>String(x.date)===String(r.date)&&Number(x.venue)===Number(r.venue)&&Number(x.race)===Number(r.race));
 const entry={date:r.date,venue:r.venue,race:r.race,reason:r.reason,sourceUrl:r.sourceUrl,tableCandidates:[]};
 if(item?.file){
  const html=await fs.readFile(path.join(dir,item.file),'utf8');
  for(const [i,m] of [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].entries()){
   const parsed=[...m[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(x=>[...x[0].matchAll(/<(?:td|th)\b[^>]*>[\s\S]*?<\/(?:td|th)>/gi)].map(c=>decode(c[0]))).filter(x=>x.length);
   if(parsed.some(x=>x.includes('着')||x.includes('枠'))||i===1)entry.tableCandidates.push({index:i,rows:parsed.slice(0,10).map(x=>x.slice(0,5))});
  }
 }
 rows.push(entry);
}
await fs.writeFile(path.join(dir,'official-unverified-finish-diagnostics.json'),JSON.stringify({unverifiedCount:rows.length,rows,warning:'Diagnostic only; incomplete/nonstandard result rows must not be treated as verified finishes.'},null,2)+'\n');
console.log('Unverified finish diagnostics:',JSON.stringify(rows).slice(0,11000));
