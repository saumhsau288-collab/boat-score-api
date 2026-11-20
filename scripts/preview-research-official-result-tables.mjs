// Preview result table cell layout without assuming a finishing order.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'official-result-page-availability.json'),'utf8'));
const decode=s=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const rows=[];
for(const item of manifest.rows){
 if(!item.file)continue;
 const html=await fs.readFile(path.join(dir,item.file),'utf8');
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
 const preview=tables.map((table,i)=>({table:i,rows:[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].slice(0,9).map(m=>[...m[0].matchAll(/<(?:td|th)\b[^>]*>[\s\S]*?<\/(?:td|th)>/gi)].map(c=>decode(c[0])).filter(Boolean).slice(0,12)).filter(x=>x.length)}));
 rows.push({date:item.date,venue:item.venue,race:item.race,preview:preview.filter(t=>t.rows.length).slice(0,8),finishingOrderVerified:false});
}
const report={races:rows.length,rows,finishingOrderVerified:0,warning:'Cell previews only. Table index and cell position require explicit validated extraction.'};
await fs.writeFile(path.join(dir,'official-result-table-preview.json'),JSON.stringify(report,null,2)+'\n');
console.log('Official result table preview first race:',JSON.stringify(rows[0]).slice(0,9000));
