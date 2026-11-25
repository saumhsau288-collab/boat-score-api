// Research-only adapter: verified official six-racer metrics + optional separately
// sourced fields -> twelve-method input. Never infer missing start/entry/exhibition.
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';
import {auditTwelveMethodReadiness} from './audit-twelve-method-readiness.mjs';
const finite=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function adaptVerifiedOfficialMetricsToTwelve({official,extras=[]}={}){
 const checked=validateOfficialMetrics(official);
 if(!checked.verified)return {status:'insufficient_data',source:'official',reason:checked.reason};
 if(!Array.isArray(extras))throw TypeError('extras[] required');
 const extraById=new Map();
 for(const x of extras){
  const id=String(x?.racerId??'');
  if(!/^\d{4}$/.test(id)||extraById.has(id))return {status:'insufficient_data',source:'extras',reason:'duplicate_or_invalid_racer_id'};
  extraById.set(id,x);
 }
 const racers=checked.racers.map(r=>{
  const x=extraById.get(r.racerId);
  // Additional fields are accepted only if explicitly source-verified.
  const verified=x?.sourceVerified===true;
  return {boat:r.boat,racerId:r.racerId,
   nationalWinRate:r.nationalWinRate,localWinRate:r.localWinRate,
   motorTwoRate:r.motorTwoWinRate,
   entryCourse:verified?finite(x.entryCourse):null,
   averageStartTiming:verified?finite(x.averageStartTiming):null,
   exhibitionTime:verified?finite(x.exhibitionTime):null,
   last50CoursePodiumRate:verified?finite(x.last50CoursePodiumRate):null
  };
 });
 const readiness=auditTwelveMethodReadiness([{racers}]);
 return {status:'mapped',source:'verified_official_metrics',racers,
  methodReadiness:readiness.rows[0],
  warning:'Official racer metrics alone cannot authenticate entry, ST, exhibition or last50. Supplemental extras require sourceVerified and independent timing evidence.'};
}
