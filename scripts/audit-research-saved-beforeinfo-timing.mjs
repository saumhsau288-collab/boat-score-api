// Diagnose when the archived responses were observed, without treating this as official deadline verification.
import fs from 'node:fs/promises';
import path from 'node:path';
const file=process.argv[2],dir=process.argv[3]||'research-official-racelists';
if(!file)throw Error('capture_file_required');
const capture=JSON.parse(await fs.readFile(file,'utf8'));
const rows=(capture.records||[]).filter(r=>r.response?.ready===true).map(r=>{
 const requestedAt=typeof r.requestedAt==='string'?r.requestedAt:null;
 const receivedAt=typeof r.receivedAt==='string'?r.receivedAt:null;
 const valid=receivedAt&&Number.isFinite(Date.parse(receivedAt));
 const jstTime=valid?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(receivedAt)):null;
 return {date:r.date,venue:r.venue,race:r.race,requestedAt,receivedAt,jstTime,
  startVerification:r.response.startVerification??null,exhibitionVerification:r.response.exhibitionVerification??null,
  beforeinfoRequestedByCaptureUrl:true,officialDeadlineAuthenticated:false};
});
const hours=Object.fromEntries([...new Set(rows.map(r=>r.jstTime?.slice(0,2)??'unknown'))].sort().map(h=>[h,rows.filter(r=>(r.jstTime?.slice(0,2)??'unknown')===h).length]));
const report={readyRecords:rows.length,captureStart:capture.captureStart??null,captureEnd:capture.captureEnd??null,captureTimeJst:capture.captureTimeJst??null,scheduledMorningWindow:capture.scheduledMorningWindow??null,scheduledTrigger:capture.scheduledTrigger??null,hourCountsJst:hours,rows,officialDeadlineAuthenticated:false,rootCauseEstablished:false,calibrationEligible:false,warning:'Requesting mode=beforeinfo is not proof that official exhibition/start data was available when fetched. No official race deadline or source snapshot is authenticated.'};
await fs.writeFile(path.join(dir,'research-saved-beforeinfo-timing.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research saved beforeinfo timing:',JSON.stringify({readyRecords:report.readyRecords,captureTimeJst:report.captureTimeJst,scheduledMorningWindow:report.scheduledMorningWindow,scheduledTrigger:report.scheduledTrigger,hourCountsJst:hours,officialDeadlineAuthenticated:false,rootCauseEstablished:false}));
