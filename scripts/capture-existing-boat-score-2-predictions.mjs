#!/usr/bin/env node
// Read-only capture of the deployed Boat Score 2 predictor. No model recreation.
import fs from 'node:fs';
import crypto from 'node:crypto';

const base = process.env.BOAT_SCORE_URL || 'https://boat-score-2-preview.saumh-sau-288.workers.dev';
const date = process.env.CAPTURE_DATE || new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
if (!/^20\d{6}$/.test(date)) throw new Error('Invalid capture date');
const venues = (process.env.CAPTURE_VENUES || '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24').split(',').map(Number);
if (venues.length === 0 || venues.some(v => !Number.isInteger(v) || v < 1 || v > 24) || new Set(venues).size !== venues.length) throw new Error('Invalid venues');
const maxRaces = Number(process.env.CAPTURE_RACES || 12);
if (!Number.isInteger(maxRaces) || maxRaces < 1 || maxRaces > 12) throw new Error('Invalid races');
if (!base.startsWith('https://')) throw new Error('HTTPS required');
const run = {workflowRunId:process.env.GITHUB_RUN_ID||null, workflowRunAttempt:process.env.GITHUB_RUN_ATTEMPT||null, commit:process.env.GITHUB_SHA||null};
const captureStart = new Date().toISOString();
const rows = [];
const tasks = venues.flatMap(venue=>Array.from({length:maxRaces},(_,i)=>({venue,race:i+1})));
let cursor = 0;
async function capture({venue,race}) {
  const url = new URL('/api/predict/selected-race',base);
  url.search = new URLSearchParams({date,venue:String(venue),race:String(race),mode:'beforeinfo'}).toString();
  const requestedAt = new Date().toISOString();
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'Accept':'application/json'}});
    const responseText = await response.text();
    const receivedAt = new Date().toISOString();
    let payload;
    try { payload = JSON.parse(responseText); } catch { payload = null; }
    return {date,venue,race,requestedAt,receivedAt,httpStatus:response.status,
      responseSha256:crypto.createHash('sha256').update(responseText).digest('hex'),
      response:payload,rawResponseNonJson:payload===null,source:'existing_deployed_Boat_Score_2_selected_race'};
  } catch(e) {
    return {date,venue,race,requestedAt,receivedAt:new Date().toISOString(),
      error:String(e?.message||e),source:'existing_deployed_Boat_Score_2_selected_race'};
  }
}
await Promise.all(Array.from({length:3},async()=>{while(cursor<tasks.length){const index=cursor++;rows[index]=await capture(tasks[index]);}}));
const summary={date,captureStart,captureEnd:new Date().toISOString(),run,base,attempted:rows.length,
  httpSuccess:rows.filter(x=>x.httpStatus===200).length,ready:rows.filter(x=>x.response?.ready===true).length,
  records:rows,authenticatedBeforeRace:false,
  warning:'Raw server-observed responses only. No verified official start times, model provenance, or independently authenticated pre-race snapshots. Do not calculate prediction accuracy from this file without further validation.'};
fs.mkdirSync('prediction-captures',{recursive:true});
const target='prediction-captures/'+date+'-'+(run.workflowRunId||'local')+'.json';
fs.writeFileSync(target,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({target,date,attempted:summary.attempted,httpSuccess:summary.httpSuccess,ready:summary.ready,run},null,2));
