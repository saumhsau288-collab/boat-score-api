// Research-only comparison against UNVERIFIED official-page cutoff candidates.
// Never call a candidate an authenticated deadline or use it for score tuning.
export function summarizeCutoffCandidates(capture,evidence){
 if(!Array.isArray(capture?.records)||!Array.isArray(evidence?.records))throw Error('Invalid capture/evidence');
 const key=r=>[r.date,r.venue,r.race].join(':');
 const lookup=new Map(evidence.records.map(r=>[key(r),r]));
 const counts={ready:0,readyWithCandidate:0,readyAfterCandidate:0,readyBeforeCandidate:0,readyMissingCandidate:0};
 for(const record of capture.records){
  if(record.response?.ready!==true)continue;
  counts.ready++;
  const e=lookup.get(key(record)),candidate=e?.cutoffCandidate;
  if(candidate?.status!=='candidate_needs_official_page_identity_verification'||e?.pageIdentity?.verified===true||
   !Number.isFinite(Date.parse(candidate.cutoffAt))||!Number.isFinite(Date.parse(record.receivedAt))){
   counts.readyMissingCandidate++;continue;
  }
  counts.readyWithCandidate++;
  counts[Date.parse(record.receivedAt)>=Date.parse(candidate.cutoffAt)?'readyAfterCandidate':'readyBeforeCandidate']++;
 }
 return {date:capture.date,counts,verifiedCutoffs:0,calibrationEligible:0,
  warning:'Candidate-only timing diagnostic; official race identity and cutoff not authenticated. Never use for historical scoring or accuracy.'};
}
