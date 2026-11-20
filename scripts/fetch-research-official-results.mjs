// Research-only: archive official result-page availability, never invent a finishing order.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const queueFile=process.argv[2],dir=process.argv[3]||'research-official-racelists';
if(!queueFile)throw Error('queue_file_required');
const queue=JSON.parse(await fs.readFile(queueFile,'utf8'));
if(!Array.isArray(queue.queue))throw Error('invalid_queue');
const rows=[];
for(const item of queue.queue){
 const date=String(item.date),venue=Number(item.venue),race=Number(item.race);
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)throw Error('invalid_race_key');
 const url='https://www.boatrace.jp/owpc/pc/race/raceresult?rno='+race+'&jcd='+String(venue).padStart(2,'0')+'&hd='+date;
 const row={date,venue,race,url,requestedAt:new Date().toISOString(),source:'official_boatrace_result_page_posthoc',resultVerified:false,finishingOrderExtracted:false};
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  let response;
  try{response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'BoatScoreResearchEvidenceAudit/1.0'}});}finally{clearTimeout(timeout);}
  const body=await response.text();
  row.httpStatus=response.status;row.bytes=Buffer.byteLength(body);row.sha256=crypto.createHash('sha256').update(body).digest('hex');
  if(response.ok&&body.length){
   const filename='result-'+date+'-'+String(venue).padStart(2,'0')+'-'+race+'.html';
   await fs.writeFile(path.join(dir,filename),body);row.file=filename;
  }else row.error='empty_or_non_success';
 }catch(e){row.error=String(e?.message||e);}
 rows.push(row);
}
const report={total:rows.length,downloaded:rows.filter(x=>x.file).length,resultVerified:0,finishingOrderExtracted:0,calibrationEligible:0,rows,warning:'HTTP 200 does not prove a completed race or validated finishing order. Do not use these pages for weight tuning without parsing and independent validation.'};
await fs.writeFile(path.join(dir,'official-result-page-availability.json'),JSON.stringify(report,null,2)+'\n');
console.log('Official result page availability:',JSON.stringify({total:report.total,downloaded:report.downloaded,resultVerified:0,finishingOrderExtracted:0,calibrationEligible:0}));
