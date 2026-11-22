// Research only. Compare exclusion of 1, 2, or 3 boats using immutable pre-race scores.
// Input: JSON array [{date,venue,race,capturedAt,deadlineAt,boats:[{boat,score}],officialFinish:[1..6],resultVerified:true}]
// No score reconstruction from outcomes; no modifications to production prediction weights.
import fs from 'node:fs';
const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&/^20\d\d-\d\d-\d\dT/.test(x);
export function auditTopTwoExclusions(records){
 if(!Array.isArray(records))throw Error('Expected records array');
 const byCount={1:{eligible:0,success:0,excludedActualFirst:0,excludedActualSecond:0,firstPickHits:0,firstTwoExactHits:0,topThreeExactHits:0},
  2:{eligible:0,success:0,excludedActualFirst:0,excludedActualSecond:0,firstPickHits:0,firstTwoExactHits:0,topThreeExactHits:0},
  3:{eligible:0,success:0,excludedActualFirst:0,excludedActualSecond:0,firstPickHits:0,firstTwoExactHits:0,topThreeExactHits:0}};
 const seen=new Set();let held=0;const details=[];
 for(const row of records){
  const key=[row.date,row.venue,row.race].join(':');
  if(seen.has(key))throw Error('Duplicate race '+key);
  seen.add(key);
  const boats=row.boats,finish=row.officialFinish;
  const valid=String(row.date).match(/^20\d{6}$/)&&Number.isInteger(row.venue)&&row.venue>=1&&row.venue<=24&&Number.isInteger(row.race)&&row.race>=1&&row.race<=12&&
   validTime(row.capturedAt)&&validTime(row.deadlineAt)&&Date.parse(row.capturedAt)<Date.parse(row.deadlineAt)&&row.resultVerified===true&&
   Array.isArray(boats)&&boats.length===6&&new Set(boats.map(x=>x.boat)).size===6&&boats.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&typeof x.score==='number'&&Number.isFinite(x.score))&&
   Array.isArray(finish)&&finish.length===6&&new Set(finish).size===6&&finish.every(x=>Number.isInteger(x)&&x>=1&&x<=6)&&row.incidentFree===true;
  if(!valid){held++;details.push({key,status:'held_missing_or_invalid_pre_race_evidence'});continue;}
  const sorted=[...boats].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
  const outcomes={};
  for(const n of [1,2,3]){
   const excluded=sorted.slice(-n),remaining=sorted.slice(0,6-n),stat=byCount[n];
   const success=!excluded.includes(finish[0])&&!excluded.includes(finish[1]);
   stat.eligible++;if(success)stat.success++;
   if(excluded.includes(finish[0]))stat.excludedActualFirst++;
   if(excluded.includes(finish[1]))stat.excludedActualSecond++;
   if(remaining[0]===finish[0])stat.firstPickHits++;
   if(remaining[0]===finish[0]&&remaining[1]===finish[1])stat.firstTwoExactHits++;
   if(sorted.slice(0,3).every((x,i)=>x===finish[i]))stat.topThreeExactHits++;
   outcomes[n]={excluded,remaining,success,firstCorrect:remaining[0]===finish[0],firstTwoExact:remaining[0]===finish[0]&&remaining[1]===finish[1]};
  }
  details.push({key,status:'evaluated',outcomes});
 }
 const rates={};
 for(const n of [1,2,3]){const s=byCount[n];rates[n]={...s,exclusionSuccessRate:s.eligible?s.success/s.eligible:null,randomBaseline:n===1?2/3:n===2?2/5:1/5};}
 return {total:records.length,held,byCount:rates,details,note:'Research only: exclusion success and conditional finishing order; pre-race scores and verified results required.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==3)throw Error('Usage: node scripts/audit-top-two-exclusions.mjs race-evidence.json');
 console.log(JSON.stringify(auditTopTwoExclusions(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
}
