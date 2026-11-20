// Research-only HTML table diagnostics. Records cell counts and short header excerpts.
// Does not infer numeric racer data or assert pre-race provenance.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const rows=[];
for(const entry of manifest.rows){
 const item={date:entry.date,venue:entry.venue,race:entry.race,tables:0,rows:0,headerCells:0,dataCells:0,boatNumberCandidates:0,firstHeaders:[],verifiedSixRacers:false};
 if(entry.file){
  const html=await fs.readFile(path.join(dir,entry.file),'utf8');
  item.tables=(html.match(/<table\b/gi)||[]).length;
  item.rows=(html.match(/<tr\b/gi)||[]).length;
  item.headerCells=(html.match(/<th\b/gi)||[]).length;
  item.dataCells=(html.match(/<td\b/gi)||[]).length;
  const headers=[...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
  item.firstHeaders=headers.slice(0,18).map(x=>x.slice(0,65));
  item.boatNumberCandidates=(html.match(/(?:艇番|boat-number|boatNo|is-boat)/gi)||[]).length;
 }
 rows.push(item);
}
const report={total:rows.length,rows,verifiedSixRacers:0,calibrationEligible:0,warning:'HTML table structure only. Counts and header excerpts are not verified racer rows or pre-race inputs.'};
await fs.writeFile(path.join(dir,'table-layout-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('Table layout first two:',JSON.stringify(rows.slice(0,2)));
console.log('Table layout counts:',JSON.stringify({total:rows.length,withRows:rows.filter(x=>x.rows>0).length,withDataCells:rows.filter(x=>x.dataCells>0).length}));
