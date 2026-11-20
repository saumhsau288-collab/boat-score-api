// Research-only audit: check whether saved ready responses identify deployed source.
export function auditResearchPredictionProvenance(capture){
 if(!capture||!Array.isArray(capture.records)||capture.authenticatedBeforeRace!==false)
  return {status:'invalid_capture',readyResponses:0,withCommit:0,withBranch:0,withVersion:0,fullyIdentified:0,authenticated:0,calibrationEligible:false};
 let readyResponses=0,withCommit=0,withBranch=0,withVersion=0,fullyIdentified=0;
 for(const record of capture.records){
  const response=record?.response;
  if(response?.ready!==true)continue;
  readyResponses++;
  const commit=typeof response.sourceCommit==='string'&&/^[a-f0-9]{40}$/.test(response.sourceCommit);
  const branch=typeof response.sourceBranch==='string'&&response.sourceBranch.length>0;
  const version=typeof response.version==='string'&&response.version.length>0;
  withCommit+=Number(commit);withBranch+=Number(branch);withVersion+=Number(version);
  fullyIdentified+=Number(commit&&branch&&version);
 }
 return {status:'response_provenance_audited_not_authenticated',readyResponses,withCommit,withBranch,withVersion,fullyIdentified,authenticated:0,calibrationEligible:false,warning:'Self-reported metadata is not proof of the deployed revision. Deployment logs and original inputs are still required.'};
}
