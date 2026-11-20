// Research-only fetch of official race-list pages for candidate races.
// HTML is preserved as post-hoc evidence, never as an authenticated pre-race feature snapshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const input=process.argv[2],output=process.argv[3]||'research-official-racelists';
if(!input)throw Error('Usage: node scripts/fetch-research-official-racelists.mjs queue.json [output-dir]');
const queue=JSON.parse(await fs.readFile(input,'utf8'));
if(!Array.isArray(queue.queue))throw Error('invalid_queue');
await fs.mkdir(output,{recursive:true});
const rows=[];
for(const item of queue.queue){
 const {date,venue,race,officialRaceListUrl:url}=item;
 const record={date,venue,race,url,requestedAt:new Date().toISOString(),source:'official_boatrace_racelist_posthoc_lookup',authenticatedBeforeRace:false,featureValuesExtracted:false};
 try{
  if(!/^https:\/\/www\.boatrace\.jp\/owpc\/pc\/race\/racelist\?/.test(url))throw Error('invalid_official_url');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  let response;
  try{response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'BoatScoreResearchEvidenceAudit/1.0'}});}
  finally{clearTimeout(timeout);}
  const body=await response.text();
  record.receivedAt=new Date().toISOString();
  record.httpStatus=response.status;
  record.bytes=Buffer.byteLength(body);
  record.sha256=crypto.createHash('sha256').update(body).digest('hex');
  if(response.ok&&body.length>0){
   const filename=date+'-'+String(venue).padStart(2,'0')+'-'+race+'.html';
   await fs.writeFile(path.join(output,filename),body);
   record.file=filename;
  }else record.error='non_success_or_empty_response';
 }catch(e){record.error=String(e?.message||e);}
 rows.push(record);
}
const report={total:rows.length,downloaded:rows.filter(x=>x.file).length,authenticatedBeforeRace:0,calibrationEligible:0,rows,warning:'Retrieved pages are post-hoc research copies. They cannot reconstruct the data visible to the deployed predictor before the race.'};
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,downloaded:report.downloaded,calibrationEligible:0},null,2));
