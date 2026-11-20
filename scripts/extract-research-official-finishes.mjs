// Research-only official finish-order extraction, strict table headers and six unique boats.
// HTML is post-hoc; extracting finish order does not authenticate original prediction timing.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'official-result-page-availability.json'),'utf8'));
const decode=s=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const numeric=s=>Number(String(s).replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296)));
const rows=[];
for(const item of manifest.rows){
 const out={date:item.date,venue:item.venue,race:item.race,sourceUrl:item.url,sourceSha256:item.sha256??null,finishVerified:false,finishingBoats:null,reason:null};
 if(!item.file){out.reason='html_missing';rows.push(out);continue;}
 const html=await fs.readFile(path.join(dir,item.file),'utf8');
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
 const candidates=[];
 for(const table of tables){
  const parsed=[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>[...m[0].matchAll(/<(?:td|th)\b[^>]*>[\s\S]*?<\/(?:td|th)>/gi)].map(c=>decode(c[0]))).filter(x=>x.length);
  if(parsed[0]?.[0]!=='着'||parsed[0]?.[1]!=='枠')continue;
  const finish=parsed.slice(1).map(c=>({position:numeric(c[0]),boat:numeric(c[1]),racer:c[2]??null}));
  if(finish.length===6&&finish.every((x,i)=>x.position===i+1&&Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6)&&new Set(finish.map(x=>x.boat)).size===6)candidates.push(finish);
 }
 if(candidates.length!==1){out.reason='unverified_or_ambiguous_finish_table';}
 else{out.finishVerified=true;out.finishingBoats=candidates[0].map(x=>x.boat);out.racers=candidates[0];}
 rows.push(out);
}
const report={total:rows.length,verifiedSixBoatFinish:rows.filter(x=>x.finishVerified).length,unverified:rows.filter(x=>!x.finishVerified).length,rows,preRaceAuthenticated:false,calibrationEligible:false,warning:'Official finishing order is post-hoc. Saved predictions have not been independently authenticated as pre-race. No model accuracy or tuning claim.'};
await fs.writeFile(path.join(dir,'official-verified-finishing-orders.json'),JSON.stringify(report,null,2)+'\n');
console.log('Official six-boat finishing order audit:',JSON.stringify({total:report.total,verifiedSixBoatFinish:report.verifiedSixBoatFinish,unverified:report.unverified,calibrationEligible:false}));
console.log('First official finishing order:',JSON.stringify(rows[0]));
