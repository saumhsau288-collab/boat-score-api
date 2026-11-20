// Research-only: inspect failed fifth-boat data without fabricating missing values.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const report=JSON.parse(await fs.readFile(path.join(dir,'six-racer-extraction.json'),'utf8'));
for(const record of report.rows.filter(x=>!x.completeSixRacers)){
 const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
 const source=manifest.rows.find(x=>x.venue===record.venue&&x.race===record.race&&x.date===record.date);
 if(!source?.file)continue;
 const html=await fs.readFile(path.join(dir,source.file),'utf8');
 const trs=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 const m=trs[21];
 if(!m){console.log('Fifth boat row absent',record.venue,record.race);continue;}
 const cells=[...m[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(x=>x[2].replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim());
 console.log('Failed boat-five row:',JSON.stringify({venue:record.venue,race:record.race,cells:cells.slice(0,9)}));
}
