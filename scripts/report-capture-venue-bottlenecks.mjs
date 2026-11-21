#!/usr/bin/env node
// Read-only breakdown of saved deployed predictor responses, by venue and failure cause.
import fs from 'node:fs';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/report-capture-venue-bottlenecks.mjs capture.json');process.exit(2);}
const capture=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(capture.records))throw Error('Expected records array');
const byVenue=[];
for(let venue=1;venue<=24;venue++){
 const rows=capture.records.filter(x=>Number(x.venue)===venue);
 if(!rows.length)continue;
 const count=fn=>rows.filter(fn).length;
 byVenue.push({venue,attempted:rows.length,ready:count(x=>x.response?.ready===true),
  timeout:count(x=>/timeout/i.test(String(x.error??''))),
  otherError:count(x=>x.error&&!/timeout/i.test(String(x.error))),
  officialStatsUnverified:count(x=>x.response?.reason==='official_six_boat_stats_unverified'),
  otherUnready:count(x=>x.httpStatus===200&&x.response?.ready!==true&&x.response?.reason!=='official_six_boat_stats_unverified')});
}
const totals=byVenue.reduce((a,x)=>{for(const k of ['attempted','ready','timeout','otherError','officialStatsUnverified','otherUnready'])a[k]=(a[k]||0)+x[k];return a;},{});
console.log(JSON.stringify({date:capture.date,sourceRun:capture.run?.workflowRunId??null,totals,byVenue,warning:'Venue-level HTTP and predictor status only; active racing status and pre-race provenance not verified.'},null,2));
