// Research-only: inspect source eligibility without assigning scores or filling missing inputs.
import {assessResearchSourceBundle} from './assess-research-source-bundle.mjs';
export function describeResearchSourceReadiness({sources,deadlineAt}={}){
 const result=assessResearchSourceBundle({sources,deadlineAt});
 const names={official:'公式出走表',averageST:'予想前平均ST',exhibition:'展示',entry:'進入',weather:'風波',makulabo:'まくらぼ'};
 const rows=Object.entries(result.checks).map(([source,check])=>({
  source,label:names[source],status:check.eligible?'verified':'held',reason:check.reason
 }));
 return {status:result.eligible?'all_sources_verified':'held',verifiedCount:rows.filter(x=>x.status==='verified').length,
  requiredCount:rows.length,rows,eligibleForCalibration:false,scoreChangeApplied:false};
}
