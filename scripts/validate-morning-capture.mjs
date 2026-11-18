#!/usr/bin/env node
// Validate raw capture coverage; never label captured responses as authenticated forecasts.
import fs from 'node:fs';
const file=process.argv[2];
if(!file)throw new Error('Usage: node scripts/validate-morning-capture.mjs <capture.json>');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
if(!/^20\d{6}$/.test(data.date)||!Array.isArray(data.records)||data.records.length!==data.attempted)
 throw new Error('Invalid capture header/count');
if(data.authenticatedBeforeRace!==false)throw new Error('Capture must not claim pre-race authentication');
// Timing metadata is descriptive only; never upgrade it to pre-race authentication.
function jstDate(iso){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return parts.year+parts.month+parts.day;
}
if(data.captureStart!==undefined || data.captureEnd!==undefined || data.captureJstDate!==undefined){
 if(!Number.isFinite(Date.parse(data.captureStart))||!Number.isFinite(Date.parse(data.captureEnd))||Date.parse(data.captureStart)>Date.parse(data.captureEnd))throw new Error('Invalid capture interval');
 if(data.captureJstDate!==jstDate(data.captureStart))throw new Error('Incorrect capture JST date');
 if(data.captureDateMatchesJst!==(data.date===data.captureJstDate))throw new Error('Incorrect JST date match flag');
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(data.captureStart));
 if(data.captureTimeJst!==time)throw new Error('Incorrect JST capture time');
 if(data.scheduledMorningWindow!==(data.captureDateMatchesJst&&time>='07:45'&&time<='08:30'))throw new Error('Incorrect morning window flag');
}
const keys=new Set(),stats={attempted:0,httpSuccess:0,ready:0,validMainSixAndUpsetSix:0,unverified:0,errors:0};
const validPick=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(p).size===3;
const validSix=a=>Array.isArray(a)&&a.length===6&&a.every(validPick)&&new Set(a.map(p=>p.join('-'))).size===6;
for(const row of data.records){
 const key=[row.date,row.venue,row.race].join(':');
 if(keys.has(key))throw new Error('Duplicate race: '+key);
 keys.add(key);
 if(row.date!==data.date||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12)throw new Error('Invalid race identity');
 if(!row.requestedAt||!row.receivedAt||!Number.isFinite(Date.parse(row.requestedAt))||!Number.isFinite(Date.parse(row.receivedAt))||Date.parse(row.requestedAt)>Date.parse(row.receivedAt))throw new Error('Invalid capture timestamps');
 if(data.captureStart!==undefined&&(Date.parse(row.requestedAt)<Date.parse(data.captureStart)||Date.parse(row.receivedAt)>Date.parse(data.captureEnd)))throw new Error('Race request outside capture interval');
 stats.attempted++;
 if(row.error){
   if(row.httpStatus!==undefined || row.response!==undefined)
     throw new Error('Network error row cannot also claim HTTP success or response');
   stats.errors++;continue;
 }
 if(!Number.isInteger(row.httpStatus)||row.httpStatus<100||row.httpStatus>599)
   throw new Error('Missing or invalid HTTP status');
 if(row.response?.ready===true&&row.httpStatus!==200)
   throw new Error('Ready prediction requires HTTP 200');
 if(row.responseSha256!==undefined &&
    (typeof row.responseSha256!=='string'||!/^[0-9a-f]{64}$/.test(row.responseSha256)))
   throw new Error('Invalid raw response digest');
 if(row.httpStatus===200 && row.rawResponseNonJson===true && row.response!==null)
   throw new Error('Non-JSON response flag contradicts parsed response');
 if(row.response?.ready===true && row.rawResponseNonJson===true)
   throw new Error('Ready prediction cannot be a non-JSON response');
 if(row.httpStatus===200)stats.httpSuccess++;
 if(row.response?.ready===true){
   stats.ready++;
   if(validSix(row.response.main)&&validSix(row.response.upset))stats.validMainSixAndUpsetSix++;
 }
 stats.unverified++;
}
if(stats.httpSuccess!==data.httpSuccess||stats.ready!==data.ready)throw new Error('Capture summary mismatch');
console.log(JSON.stringify({date:data.date,...stats,authenticatedBeforeRace:false},null,2));
