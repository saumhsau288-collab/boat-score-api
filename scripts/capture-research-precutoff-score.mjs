#!/usr/bin/env node
// Research-only capture: compute scores from six supplied verified pre-race inputs.
// No retrospective reconstruction, no production Worker changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {evaluateRace,SCORE_WEIGHTS} from '../boat-score-2-scoring.js';
import {auditPreCutoffScoreReceipt} from './audit-pre-cutoff-score-receipt.mjs';
export function verifySourceRunProvenance(source,provenance){
 const cutoff=Date.parse(source?.cutoffAt),created=Date.parse(provenance?.created_at),started=Date.parse(provenance?.run_started_at);
 return Number.isFinite(cutoff)&&Number.isFinite(created)&&Number.isFinite(started)&&created<=started&&started<cutoff&&provenance?.conclusion==='success'&&Number.isSafeInteger(provenance?.id)&&provenance.id>0&&typeof provenance?.head_sha==='string'&&/^[a-f0-9]{40}$/.test(provenance.head_sha);
}
export function verifySourceArtifactProvenance(source,artifact,run){
 const cutoff=Date.parse(source?.cutoffAt),created=Date.parse(artifact?.created_at);
 return Number.isFinite(cutoff)&&Number.isFinite(created)&&created<cutoff&&
 Number.isSafeInteger(artifact?.id)&&artifact.id>0&&artifact?.expired===false&&
 typeof artifact?.name==='string'&&artifact.name.length>0&&artifact?.workflow_run?.id===run?.id;
}
export function buildScoreCapture(source,now=new Date().toISOString()){
 const fail=(reason)=>({status:'held',reason,eligibleForWeightTuning:false});
 if(!source||!Array.isArray(source.racers)||source.racers.length!==6)return fail('six_source_racers_required');
 if(source.officialSourceVerified!==true||source.cutoffSourceVerified!==true||source.archivedBeforeCutoffVerified!==true)return fail('independent_pre_cutoff_source_proof_required');
 if(typeof source.sourceEvidenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(source.sourceEvidenceSha256))return fail('source_evidence_hash_required');
 const captured=Date.parse(source.capturedAt),computed=Date.parse(now),cutoff=Date.parse(source.cutoffAt);
 if(![captured,computed,cutoff].every(Number.isFinite)||computed<captured||computed>=cutoff)return fail('not_computed_before_verified_cutoff');
 const racers=source.racers;
 if(racers.some((r,i)=>r.boat!==i+1||r.sourceVerified!==true||!/^\d{4}$/.test(String(r.racerId??'')))||new Set(racers.map(r=>String(r.racerId))).size!==6)return fail('six_independently_verified_racer_ids_required');
 const scored=evaluateRace(racers);
 if(scored.status!=='evaluated')return fail('complete_verified_scoring_inputs_required');
 const receipt={race:source.race,cutoffAt:source.cutoffAt,capturedAt:source.capturedAt,scoreComputedAt:now,officialSourceVerified:true,cutoffSourceVerified:true,archivedBeforeCutoffVerified:true,sourceEvidenceSha256:source.sourceEvidenceSha256,scoreAlgorithmVersion:'boat-score-2-scoring-research-v1',scoreWeights:SCORE_WEIGHTS,scores:scored.racers.map((r,i)=>({boat:r.boat,racerId:String(racers[i].racerId),score:r.score}))};
 const gate=auditPreCutoffScoreReceipt(receipt);
 if(!gate.readyForIndependentReview)return fail('receipt_failed_structural_gate:'+gate.missing.join(','));
 return {status:'research_score_captured',receipt,receiptSha256:createHash('sha256').update(JSON.stringify(receipt)).digest('hex'),authenticatedHistoricalPrediction:false,eligibleForWeightTuning:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [input,output,evidenceFile,provenanceFile,artifactFile]=process.argv.slice(2);
 if(!input||!output||!evidenceFile||!provenanceFile||!artifactFile)throw Error('Usage: node scripts/capture-research-precutoff-score.mjs verified-input.json receipt.json archived-source-evidence source-run-provenance.json source-artifact-provenance.json');
 const source=JSON.parse(fs.readFileSync(input,'utf8'));
 const evidenceHash=createHash('sha256').update(fs.readFileSync(evidenceFile)).digest('hex');
 const provenance=JSON.parse(fs.readFileSync(provenanceFile,'utf8'));
 const artifact=JSON.parse(fs.readFileSync(artifactFile,'utf8'));
 const result=evidenceHash!==source.sourceEvidenceSha256?{status:'held',reason:'source_evidence_bytes_hash_mismatch',eligibleForWeightTuning:false}:
 !verifySourceRunProvenance(source,provenance)?{status:'held',reason:'source_run_not_independently_before_cutoff',eligibleForWeightTuning:false}:
 !verifySourceArtifactProvenance(source,artifact,provenance)?{status:'held',reason:'source_artifact_not_independently_before_cutoff',eligibleForWeightTuning:false}:buildScoreCapture(source);
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,reason:result.reason??null,output}));
 if(result.status!=='research_score_captured')process.exitCode=2;
}
