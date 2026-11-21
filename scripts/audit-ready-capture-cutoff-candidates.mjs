#!/usr/bin/env node
// Diagnostic only: post-hoc cutoff candidates do not authenticate pre-race predictions.
import fs from 'node:fs';
export function auditCutoffCandidates(captures, candidates) {
 if(!Array.isArray(captures?.records)||!Array.isArray(candidates))throw Error('records_and_candidates_required');
 const key=r=>[r.date,r.venue,r.race].join(':');
 const map=new Map();
 for(const c of candidates){
  if(!/^20\d{6}$/.test(String(c.date))||!Number.isInteger(c.venue)||c.venue<1||c.venue>24||!Number.isInteger(c.race)||c.race<1||c.race>12||!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(c.cutoffCandidateUtc)||!Number.isFinite(Date.parse(c.cutoffCandidateUtc)))throw Error('invalid_cutoff_candidate');
  const k=key(c);
  if(map.has(k))throw Error('duplicate_cutoff_candidate');
  map.set(k,c);
 }
 const ready=captures.records.filter(r=>r?.httpStatus===200&&r?.response?.ready===true);
 const rows=ready.map(r=>{
  const c=map.get(key(r));
  const received=typeof r.receivedAt==='string'?Date.parse(r.receivedAt):NaN;
  const validReceived=Number.isFinite(received)&&/Z$|[+-]\d\d:\d\d$/.test(r.receivedAt);
  const leadMinutes=c&&validReceived?Math.round((Date.parse(c.cutoffCandidateUtc)-received)/6000)/10:null;
  return {date:r.date,venue:r.venue,race:r.race,receivedAt:r.receivedAt??null,
   cutoffCandidateUtc:c?.cutoffCandidateUtc??null,leadMinutes,
   candidateEarlierThanReceipt:leadMinutes===null?null:leadMinutes<0,
   authenticatedBeforeRace:false,eligibleForCalibration:false};
 });
 return {ready:rows.length,withCandidate:rows.filter(r=>r.leadMinutes!==null).length,
  candidateAfterReceipt:rows.filter(r=>r.leadMinutes!==null&&r.leadMinutes>=0).length,
  candidateBeforeReceipt:rows.filter(r=>r.candidateEarlierThanReceipt===true).length,
  independentlyAuthenticated:0,eligibleForCalibration:0,rows,
  warning:'Cutoff candidates are post-hoc diagnostics, not independently authenticated official cutoff times.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [capturesPath,candidatesPath]=process.argv.slice(2);
 if(!capturesPath||!candidatesPath)throw Error('Usage: node scripts/audit-ready-capture-cutoff-candidates.mjs captures.json candidates.json');
 console.log(JSON.stringify(auditCutoffCandidates(JSON.parse(fs.readFileSync(capturesPath,'utf8')),JSON.parse(fs.readFileSync(candidatesPath,'utf8'))),null,2));
}
