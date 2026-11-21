#!/usr/bin/env node
// Read-only race-number analysis. Never treat missing predictions as confirmed non-running races.
import fs from 'node:fs';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/report-capture-race-bottlenecks.mjs capture.json');process.exit(2);}
const data=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(data.records))throw Error('Expected records array');
const byRace=Array.from({length:12},(_,i)=>{
 const race=i+1,rows=data.records.filter(x=>Number(x.race)===race);
 const count=fn=>rows.filter(fn).length;
 return {race,attempted:rows.length,ready:count(x=>x.response?.ready===true),
 timeout:count(x=>/timeout/i.test(String(x.error??''))),
 officialStatsUnverified:count(x=>x.response?.reason==='official_six_boat_stats_unverified'),
 otherUnready:count(x=>x.httpStatus===200&&x.response?.ready!==true&&x.response?.reason!=='official_six_boat_stats_unverified'),
 otherError:count(x=>x.error&&!/timeout/i.test(String(x.error)))};
});
const firstHalf=byRace.slice(0,6),secondHalf=byRace.slice(6);
const sum=(rows,k)=>rows.reduce((n,x)=>n+x[k],0);
console.log(JSON.stringify({date:data.date,byRace,firstHalf:{attempted:sum(firstHalf,'attempted'),ready:sum(firstHalf,'ready')},
 secondHalf:{attempted:sum(secondHalf,'attempted'),ready:sum(secondHalf,'ready')},
 warning:'Race-number differences do not prove source publishing times or identify canceled/non-running races. Verify official activity independently.'},null,2));
