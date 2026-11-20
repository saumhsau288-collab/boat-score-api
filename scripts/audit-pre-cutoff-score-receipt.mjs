// Research-only gate for immutable pre-cutoff score capture receipts.
// Receipt flags are not independent authentication; archived source evidence is required.
export function auditPreCutoffScoreReceipt(receipt={}){
 const missing=[];
 const identity=receipt?.race;
 if(!identity||!/^\d{8}$/.test(String(identity.date??''))||!Number.isInteger(Number(identity.venue))||Number(identity.venue)<1||Number(identity.venue)>24||!Number.isInteger(Number(identity.race))||Number(identity.race)<1||Number(identity.race)>12)missing.push('race_identity');
 const cutoff=Date.parse(receipt?.cutoffAt);
 const captured=Date.parse(receipt?.capturedAt);
 const computed=Date.parse(receipt?.scoreComputedAt);
 if(!Number.isFinite(cutoff)||!Number.isFinite(captured)||!Number.isFinite(computed)||captured>=cutoff||computed>=cutoff||computed<captured)missing.push('verified_pre_cutoff_chronology');
 if(receipt?.officialSourceVerified!==true||receipt?.cutoffSourceVerified!==true)missing.push('official_cutoff_source_evidence');
 if(receipt?.sourceEvidenceSha256==null||! /^[a-f0-9]{64}$/.test(receipt.sourceEvidenceSha256))missing.push('source_evidence_sha256');
 if(receipt?.scoreAlgorithmVersion==null||typeof receipt.scoreAlgorithmVersion!=='string'||!receipt.scoreAlgorithmVersion.trim())missing.push('scoring_algorithm_version');
 const boats=receipt?.scores;
 if(!Array.isArray(boats)||boats.length!==6||boats.some((r,i)=>!r||r.boat!==i+1||!/^\d{4}$/.test(String(r.racerId??''))||typeof r.score!=='number'||!Number.isFinite(r.score))||new Set(boats.map(r=>String(r.racerId))).size!==6)missing.push('six_finite_scored_verified_racer_ids');
 if(receipt?.archivedBeforeCutoffVerified!==true)missing.push('independent_archive_timestamp_evidence');
 return {readyForIndependentReview:missing.length===0,authenticatedHistoricalPrediction:false,eligibleForWeightTuning:false,missing,
  note:'Passing structural checks does not authenticate the flags or establish that an archive existed before the race.'};
}
