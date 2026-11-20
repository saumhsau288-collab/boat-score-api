#!/usr/bin/env node
// Optional strict gate for research captures: requires independently authenticated official schedule evidence.
import fs from 'node:fs';
import {selectVerifiedActiveVenues} from './select-verified-active-venues.mjs';
const date=process.env.CAPTURE_DATE,venue=Number(process.env.CAPTURE_VENUE);
const evidencePath=process.env.OFFICIAL_SCHEDULE_EVIDENCE_PATH;
if(!evidencePath){
 console.log(JSON.stringify({status:'schedule_evidence_missing',allowed:false,date,venue,
  reason:'No independently verified official schedule; do not label this venue as active.'}));
 process.exitCode=2;
}else{
 try{
  const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
  const selection=selectVerifiedActiveVenues(evidence,{date});
  const allowed=selection.verified&&selection.venues.includes(venue);
  console.log(JSON.stringify({status:allowed?'verified_active_venue':'venue_not_verified_active',
   allowed,date,venue,reason:selection.reason||(!allowed?'not_in_verified_active_venues':null)}));
  if(!allowed)process.exitCode=2;
 }catch(e){
  console.log(JSON.stringify({status:'invalid_schedule_evidence',allowed:false,reason:String(e.message||e)}));
  process.exitCode=2;
 }
}
