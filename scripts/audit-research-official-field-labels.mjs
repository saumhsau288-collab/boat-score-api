// Research-only inspection of labels in archived official race-list pages.
// Count presence of field labels, not numeric values or verified racer rows.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const labels={nationalWinRate:/全国勝率|全国.*勝率/i,localWinRate:/当地勝率|当地.*勝率/i,motor:/モーター|モータ/i,exhibition:/展示タイム|展示/i,startTiming:/平均ST|スタート/i,entry:/進入/i,recent50:/直近50走|50走/i};
const rows=[];
for(const entry of manifest.rows){
 const row={date:entry.date,venue:entry.venue,race:entry.race,archived:!!entry.file,labels:{},verifiedRacerFields:0};
 if(entry.file){
  const html=await fs.readFile(path.join(dir,entry.file),'utf8');
  // Remove scripts/styles to avoid mistaking application source code for race data.
  const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ');
  for(const [field,pattern] of Object.entries(labels))row.labels[field]=pattern.test(visible);
 }
 rows.push(row);
}
const counts=Object.fromEntries(Object.keys(labels).map(field=>[field,rows.filter(r=>r.labels[field]).length]));
const report={total:rows.length,labelPresenceCounts:counts,verifiedRacerFields:0,calibrationEligible:0,rows,warning:'Text labels alone do not establish numeric values, racer identity, six-racer completeness, or pre-race authenticity.'};
await fs.writeFile(path.join(dir,'field-label-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('Official race-list label presence:',JSON.stringify(counts));
