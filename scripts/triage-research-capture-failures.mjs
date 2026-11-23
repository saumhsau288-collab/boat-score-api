// Research-only failure triage. Counts observed failures, never estimates recoverable races.
import {summarizeCaptureFailureTypes} from './classify-capture-failures.mjs';
const actions={
 http_403:'Investigate authorized upstream access; do not bypass restrictions or increase retries.',
 http_429:'Respect rate limits and reduce request frequency.',
 timeout_or_abort:'Inspect request latency and concurrency; no assumed retry improvement.',
 missing_http_response:'Inspect transport logs and missing response metadata.',
 other_http_failure:'Inspect upstream status codes and request diagnostics.',
 not_ready_unclassified:'Check source readiness and independently verified race schedule; do not label non開催.',
 invalid_or_unknown_response:'Inspect response schema and parser handling.',
 ready:'Inspect eligibility and independent pre-race provenance; ready is not accuracy proof.'
};
export function triageResearchCaptureFailures(archives){
 const summary=summarizeCaptureFailureTypes(archives);
 const ranked=Object.entries(summary.byType).filter(([type])=>type!=='ready')
  .map(([type,count])=>({type,count,sharePercent:summary.total?Number((count*100/summary.total).toFixed(2)):null,nextAction:actions[type]??'Investigate unknown classification'}))
  .sort((a,b)=>b.count-a.count||a.type.localeCompare(b.type));
 return {total:summary.total,ready:summary.byType.ready??0,notReadyOrFailed:summary.total-(summary.byType.ready??0),ranked,byDay:summary.byDay,warning:'Diagnostic priorities only. These records cannot establish accuracy, active venues, or the number of failures that can be recovered.'};
}
