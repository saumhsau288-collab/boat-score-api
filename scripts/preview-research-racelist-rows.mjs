// Research-only table row preview. No claims that candidate rows are verified racers.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const rows=[];
for(const item of manifest.rows){
 if(!item.file)continue;
 const html=await fs.readFile(path.join(dir,item.file),'utf8');
 const trs=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 const preview=trs.map((m,index)=>{
  const cells=[...m[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  const texts=cells.map(x=>x[2].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim());
  return {rowIndex:index,cellCount:cells.length,firstCells:texts.slice(0,10).map(x=>x.slice(0,45)),containsRegistrationLabel:/登録番号|級別|氏名/.test(texts.join(' '))};
 }).filter(x=>x.cellCount>=5);
 rows.push({date:item.date,venue:item.venue,race:item.race,candidateRows:preview.length,firstCandidates:preview.slice(0,9),verifiedRacers:0});
}
const report={total:rows.length,rows,verifiedRacers:0,warning:'Preview only; cell position and text do not independently verify racer identity or pre-race authenticity.'};
await fs.writeFile(path.join(dir,'row-preview-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('Race-list row previews:',JSON.stringify(rows.slice(0,2)));
