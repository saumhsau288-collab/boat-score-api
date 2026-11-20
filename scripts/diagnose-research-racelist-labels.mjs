// Research-only diagnostics for unexpected label formats in official HTML.
// Counts text fragments, never treats them as verified numerical racer data.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const terms=['勝率','当地','全国','モーター','平均ST','スタート','進入','展示','50走'];
const counts=Object.fromEntries(terms.map(t=>[t,0]));
const examples=Object.fromEntries(terms.map(t=>[t,[]]));
for(const row of manifest.rows){
 if(!row.file)continue;
 const html=await fs.readFile(path.join(dir,row.file),'utf8');
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt);|&#\d+;/gi,' ').replace(/\s+/g,' ');
 for(const term of terms){
  const i=visible.indexOf(term);
  if(i<0)continue;
  counts[term]++;
  if(examples[term].length<2)examples[term].push(visible.slice(Math.max(0,i-35),Math.min(visible.length,i+term.length+35)));
 }
}
const report={total:manifest.rows.length,counts,examples,verifiedSixRacerInputs:0,warning:'Examples are post-hoc page text, not authenticated pre-race racer data. Do not tune weights from this report.'};
await fs.writeFile(path.join(dir,'label-diagnostics.json'),JSON.stringify(report,null,2)+'\n');
console.log('Label diagnostic counts:',JSON.stringify(counts));
console.log('Label diagnostic examples:',JSON.stringify(examples));
