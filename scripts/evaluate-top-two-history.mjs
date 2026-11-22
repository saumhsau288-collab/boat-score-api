// Usage: node scripts/evaluate-top-two-history.mjs path/to/verified-prerace.jsonl
// Each line: {date,venue,race,observedAt,cutoffAt,sourceVerified:true,
//   snapshot:{racers:[{boat,nationalRate,localRate,averageST,course?},...]},
//   officialFinish:[1,2,3,4,5,6],resultVerified:true}
// Refuse retrospective current-stat reconstructions and duplicated races.
import fs from 'node:fs';
import {evaluateTopTwoExclusions} from '../top-two-exclusion.mjs';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/evaluate-top-two-history.mjs verified-prerace.jsonl');process.exit(2);}
const rows=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map((line,i)=>{
  try{return JSON.parse(line);}catch{throw Error('Invalid JSON at line '+(i+1));}
});
const seen=new Set(),cases=[];
for(const [i,row] of rows.entries()){
  const key=[row.date,row.venue,row.race].join(':');
  if(!/^20\d{6}$/.test(String(row.date))||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||
     !Number.isInteger(row.race)||row.race<1||row.race>12||seen.has(key))
    throw Error('Invalid or duplicated race at line '+(i+1));
  seen.add(key);
  const before=Date.parse(row.observedAt),cutoff=Date.parse(row.cutoffAt);
  if(row.sourceVerified!==true||row.resultVerified!==true||!Number.isFinite(before)||
     !Number.isFinite(cutoff)||before>=cutoff)
    throw Error('Verified pre-race snapshot and official finish required at line '+(i+1));
  if(!Array.isArray(row.officialFinish)||row.officialFinish.length!==6||
     new Set(row.officialFinish).size!==6||
     row.officialFinish.some(n=>!Number.isInteger(n)||n<1||n>6))
    throw Error('Invalid official finish at line '+(i+1));
  cases.push({snapshot:row.snapshot,officialFinish:row.officialFinish});
}
const metrics=evaluateTopTwoExclusions(cases);
console.log(JSON.stringify({inputRows:rows.length,method:'top_two_exclusion_pre_race_only',
  caveat:'Only input provenance flags and timestamps are checked; verify source records independently.',
  metrics},null,2));
