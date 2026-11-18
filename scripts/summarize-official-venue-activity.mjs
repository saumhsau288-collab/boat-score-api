#!/usr/bin/env node
// Research-only venue evidence; do not equate HTTP 200 with an active race day.
import fs from 'node:fs';
import path from 'node:path';
export function summarizeVenueEvidence(data) {
  if(!Array.isArray(data?.records))throw new Error('Official source records missing');
  const byVenue={};
  for(const r of data.records) {
    const venue=Number(r.venue);
    if(!Number.isInteger(venue)||venue<1||venue>24)continue;
    const key=String(venue);
    const x=byVenue[key]??={requested:0,http200:0,sourceConsistent:0,identityConsistent:0,cutoffCandidates:0,verifiedActiveRaces:0};
    x.requested++;
    if(r.httpStatus===200)x.http200++;
    if(r.sourceCheck?.status==='official_html_source_consistent_not_authenticated')x.sourceConsistent++;
    if(r.pageIdentity?.status==='identity_markers_consistent_not_authenticated')x.identityConsistent++;
    if(r.cutoffCandidate?.status==='candidate_needs_official_page_identity_verification')x.cutoffCandidates++;
    // Never promote an unverified candidate into a confirmed active race.
  }
  return {byVenue,verifiedActiveVenues:[],safeToFilterByActivity:false,
    warning:'Official race-list HTTP success, identity markers and cutoff text candidates are not independently verified active-race evidence. Do not exclude venues based on this report.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const source=process.argv[2]||'prediction-captures/official-cutoff-source-evidence.json';
 const result=summarizeVenueEvidence(JSON.parse(fs.readFileSync(source,'utf8')));
 const output='prediction-captures/official-venue-activity-evidence.json';
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output,venuesInspected:Object.keys(result.byVenue).length,verifiedActiveVenues:0,safeToFilterByActivity:false}));
}
