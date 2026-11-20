// Diagnose official pages with no recognizable finish table; avoid interpreting an HTTP 200 as a completed race.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const report=JSON.parse(await fs.readFile(path.join(dir,'official-verified-finishing-orders.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(dir,'official-result-page-availability.json'),'utf8'));
const rows=[];
for(const r of report.rows.filter(x=>!x.finishVerified)){
 const item=manifest.rows.find(x=>String(x.date)===String(r.date)&&Number(x.venue)===Number(r.venue)&&Number(x.race)===Number(r.race));
 if(!item?.file){rows.push({...r,reason:'missing_html'});continue;}
 const html=await fs.readFile(path.join(dir,item.file),'utf8');
 const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
 const words=['レース結果','レース中止','中止','不成立','着','枠','開催','レース情報','払戻','お知らせ','データがありません','該当'];
 const markers=Object.fromEntries(words.map(w=>[w,plain.includes(w)]));
 rows.push({date:r.date,venue:r.venue,race:r.race,sourceUrl:r.sourceUrl,htmlLength:html.length,tableCount:(html.match(/<table\b/gi)||[]).length,title:html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??null,markers,bodyExcerpt:plain.slice(0,750),finishingOrderVerified:false});
}
await fs.writeFile(path.join(dir,'official-missing-result-page-diagnostics.json'),JSON.stringify({rows,verifiedFinishesAdded:0,warning:'HTML inspection only; do not infer cancelled/unheld race without official status evidence.'},null,2)+'\n');
console.log('Missing result page diagnostics:',JSON.stringify(rows).slice(0,11000));
