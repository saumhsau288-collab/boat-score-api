// Retry only official result pages classified as unpublished in the earlier capture.
// Research-only. Recheck page status and extract no guessed finishing positions.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const report=JSON.parse(await fs.readFile(path.join(dir,'official-missing-result-classification.json'),'utf8'));
const rows=[];
for(const item of report.rows){
 if(!item.retryEligible){rows.push({...item,retried:false,reason:'excluded_cancelled'});continue;}
 try{
  const response=await fetch(item.sourceUrl,{headers:{'user-agent':'BoatScoreResearchEvidenceAudit/1.0'},signal:AbortSignal.timeout(20000)});
  const html=await response.text();
  const file='retry-result-'+item.date+'-'+String(item.venue).padStart(2,'0')+'-'+item.race+'.html';
  await fs.writeFile(path.join(dir,file),html);
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  rows.push({...item,retried:true,httpStatus:response.status,file,hasFinishHeader:/着[\s\S]{0,200}枠/.test(text),hasNoData:/データはありません/.test(text),hasCancellation:/レース中止/.test(text),finishVerified:false});
 }catch(e){rows.push({...item,retried:true,error:String(e),finishVerified:false});}
}
const out={rows,retried:rows.filter(r=>r.retried).length,excludedCancelled:rows.filter(r=>!r.retried).length,verifiedFinishesAdded:0,warning:'Retry archive only. A new result page requires independent strict six-boat finish verification.'};
await fs.writeFile(path.join(dir,'official-result-retry-availability.json'),JSON.stringify(out,null,2)+'\n');
console.log('Official result retry availability:',JSON.stringify(out));
