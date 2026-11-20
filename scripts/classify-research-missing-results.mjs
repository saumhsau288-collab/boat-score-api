// Classify missing official result tables without inventing a finishing order.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const report=JSON.parse(await fs.readFile(path.join(dir,'official-missing-result-page-diagnostics.json'),'utf8'));
const rows=report.rows.map(r=>{
 const text=r.bodyExcerpt??'';
 const cancelled=/レース中止/.test(text)||/11月20日\s*中止/.test(text);
 const noData=/※\s*データはありません/.test(text);
 return {date:r.date,venue:r.venue,race:r.race,sourceUrl:r.sourceUrl,status:cancelled?'cancelled':noData?'result_not_published_at_capture':'unresolved',retryEligible:!cancelled,finishVerified:false};
});
const result={rows,cancelled:rows.filter(r=>r.status==='cancelled').length,resultNotPublished:rows.filter(r=>r.status==='result_not_published_at_capture').length,unresolved:rows.filter(r=>r.status==='unresolved').length,verifiedFinishesAdded:0,warning:'Classification is based on archived page text. Retry eligibility is not evidence of completed race.'};
await fs.writeFile(path.join(dir,'official-missing-result-classification.json'),JSON.stringify(result,null,2)+'\n');
console.log('Official missing result classification:',JSON.stringify(result));
