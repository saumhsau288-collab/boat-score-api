// Research-only summary for the twelve independently saved prediction methods.
// Never turn a zero-denominator hit rate into 0%, and never call fixture tests
// evidence of real-world improvement.
import {METHOD_IDS} from '../generate-twelve-independent-methods.mjs';
import {evaluateSavedIndependentMethods} from './evaluate-saved-independent-methods.mjs';
export function reportIndependentMethodAccuracy(records=[],{dataKind='unknown'}={}){
 const summary=evaluateSavedIndependentMethods(records);
 const methods=METHOD_IDS.map(id=>{
  const s=summary.methods[id];
  return {id,eligibleRaces:s.eligible,hits:s.hits,abstained:s.abstained,
   hitRatePercent:s.eligible?Math.round(s.hits/s.eligible*10000)/100:null};
 });
 const hasVerifiedSample=summary.total>0&&summary.heldCount<summary.total&&methods.some(x=>x.eligibleRaces>0);
 const realWorldMeasured=dataKind==='authenticated_real_races'&&hasVerifiedSample;
 return {inputRecords:summary.total,heldRecords:summary.heldCount,
  heldReasons:summary.held,methods,realWorldMeasured,
  improvementVerified:false,
  conclusion:!realWorldMeasured?'NOT_MEASURED':
   'MEASURED_NO_BASELINE_COMPARISON',
  note:'Real-world improvement requires authenticated race-time evidence and a comparable old-method baseline. Fixtures and caller flags are insufficient.'};
}
