// Offline historical result record consistency audit; no source is auto-verified.
import fs from 'node:fs';
const dateOK=d=>{
 if(typeof d!=='string'||!/^20\d{6}$/.test(d))return false;
 const y=+d.slice(0,4),m=+d.slice(4,6),day=+d.slice(6),x=new Date(Date.UTC(y,m-1,day));
 return x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===day;
};
export function auditHistoricalRacerRecordConsistency(records,{asOfDate}={}){
 if(!Array.isArray(records)||!dateOK(asOfDate))throw Error('records[] and valid asOfDate required');
 const groups=new Map(),rejected={invalidKey:0,notEarlier:0};
 for(const row of records){
  if(!dateOK(row?.date)||!Number.isInteger(row?.venue)||row.venue<1||row.venue>24||
   !Number.isInteger(row?.race)||row.race<1||row.race>12){rejected.invalidKey++;continue;}
  if(row.date>=asOfDate){rejected.notEarlier++;continue;}
  const key=[row.date,row.venue,row.race].join(':');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(row);
 }
 const races=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>{
  const [date,venue,race]=key.split(':');
  const checks=[
   ['six_rows',rows.length===6],
   ['unique_racer_ids',rows.length===6&&rows.every(r=>typeof r.racerId==='string'&&/^\d{4,6}$/.test(r.racerId))&&new Set(rows.map(r=>r.racerId)).size===6],
   ['unique_boat_numbers',rows.length===6&&rows.every(r=>Number.isInteger(r.boat)&&r.boat>=1&&r.boat<=6)&&new Set(rows.map(r=>r.boat)).size===6],
   ['unique_actual_courses',rows.length===6&&rows.every(r=>Number.isInteger(r.course)&&r.course>=1&&r.course<=6)&&new Set(rows.map(r=>r.course)).size===6],
   ['unique_finishes',rows.length===6&&rows.every(r=>Number.isInteger(r.finish)&&r.finish>=1&&r.finish<=6)&&new Set(rows.map(r=>r.finish)).size===6],
   ['source_provenance_asserted',rows.length===6&&rows.every(r=>r.historicalRecordVerified===true&&typeof r.sourceUrl==='string'&&(()=>{try{const u=new URL(r.sourceUrl);return u.protocol==='https:'&&(u.hostname==='boatrace.jp'||u.hostname.endsWith('.boatrace.jp'));}catch{return false;}})())]
  ];
  const issues=checks.filter(([,ok])=>!ok).map(([name])=>name);
  return {date,venue:Number(venue),race:Number(race),records:rows.length,consistent:issues.length===0,issues};
 });
 return {method:'historical_racer_record_consistency_audit',asOfDate,races,rejected,
  consistentRaces:races.filter(r=>r.consistent).length,eligibleForScoreChange:false,
  warning:'Structural consistency and source flags are not independent authentication. No inferred course, no future leakage, no scoring changes.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,asOfDate,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/audit-historical-racer-record-consistency.mjs <records.json> <YYYYMMDD> <report.json>');
 const result=auditHistoricalRacerRecordConsistency(JSON.parse(fs.readFileSync(input,'utf8')),{asOfDate});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({races:result.races.length,consistentRaces:result.consistentRaces,rejected:result.rejected}));
}
