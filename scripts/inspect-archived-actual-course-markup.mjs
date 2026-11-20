import fs from 'node:fs';
import path from 'node:path';
import {inspectOfficialResultMarkup} from './inspect-official-result-markup.mjs';
const dir=process.argv[2]||'prediction-captures';
const files=fs.readdirSync(dir).filter(f=>/^research-result-\d{8}-\d{2}-\d{1,2}\.html$/.test(f)).sort();
const report=[];
for(const f of files){
 const html=fs.readFileSync(path.join(dir,f),'utf8');
 const inspected=inspectOfficialResultMarkup(html);
 const relevant=inspected.tableSamples.filter(t=>t.rows.some(r=>/スタート|進入|コース|\.\d{2}/.test(r.sample)));
 report.push({race:f.replace(/^research-result-/,'').replace(/\.html$/,''),tables:relevant.map(t=>({index:t.tableIndex,rows:t.rows.map(r=>({cells:r.cellCount,headers:r.headerCount,sample:r.sample.slice(0,120)}))}))});
}
const rawSamples=files.slice(0,2).map(f=>{const html=fs.readFileSync(path.join(dir,f),'utf8');const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];return {race:f,rawStartTable:tables[2]?.[0]?.slice(0,9000)??null};});
const summary={rawSamples,status:'official_actual_course_markup_inspection',races:report.length,courseVerified:0,reason:'markup_only_not_yet_course_identity_verified',report};
fs.writeFileSync(path.join(dir,'official-actual-course-markup-inspection.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
