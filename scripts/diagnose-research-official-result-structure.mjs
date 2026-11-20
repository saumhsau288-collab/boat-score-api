// Diagnose archived official result-page markup before attempting finishing-order extraction.
// Read-only and post-hoc; never claim a verified finishing order.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'official-result-page-availability.json'),'utf8'));
const rows=[];
for(const item of manifest.rows){
 if(!item.file){rows.push({date:item.date,venue:item.venue,race:item.race,available:false});continue;}
 const html=await fs.readFile(path.join(dir,item.file),'utf8');
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const marker=(term)=>text.includes(term);
 const tables=(html.match(/<table\b/gi)||[]).length;
 const trs=(html.match(/<tr\b/gi)||[]).length;
 const snippets=[];
 for(const term of ['着順','艇番','決まり手','払戻金','レース結果','不成立']){
  const index=text.indexOf(term);
  if(index>=0)snippets.push({term,context:text.slice(Math.max(0,index-35),index+110)});
 }
 rows.push({date:item.date,venue:item.venue,race:item.race,available:true,tables,tableRows:trs,hasFinishLabel:marker('着順'),hasBoatLabel:marker('艇番'),hasDecisionLabel:marker('決まり手'),hasPayoutLabel:marker('払戻金'),snippets,finishingOrderVerified:false});
}
const report={total:rows.length,available:rows.filter(x=>x.available).length,withFinishLabel:rows.filter(x=>x.hasFinishLabel).length,withBoatLabel:rows.filter(x=>x.hasBoatLabel).length,rows,finishingOrderVerified:0,calibrationEligible:0,warning:'HTML structural diagnostics only; no finishing order parsed or validated.'};
await fs.writeFile(path.join(dir,'official-result-structure.json'),JSON.stringify(report,null,2)+'\n');
console.log('Official result structure:',JSON.stringify({total:report.total,available:report.available,withFinishLabel:report.withFinishLabel,withBoatLabel:report.withBoatLabel,finishingOrderVerified:0}));
console.log('Official result first page diagnostic:',JSON.stringify(rows[0]));
