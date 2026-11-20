import {extractOfficialMetrics} from '../boat-score-2-metric-extractor.js';
import {extractGroupedOfficialSix} from './extract-grouped-official-six.mjs';
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';

// Research only. Never treat a structural match as independently authenticated pre-race evidence.
export function selectResearchOfficialMetrics(html){
 const legacy=extractOfficialMetrics(html);
 if(legacy.verified){
  const validated=validateOfficialMetrics(legacy.racers);
  if(validated.verified)return {verified:true,source:legacy.source,racers:legacy.racers,legacyReason:null,groupedReason:null};
 }
 const grouped=extractGroupedOfficialSix(html);
 if(grouped.verified){
  const validated=validateOfficialMetrics(grouped.racers);
  if(validated.verified)return {verified:true,source:grouped.source,racers:grouped.racers,legacyReason:legacy.reason??null,groupedReason:null};
 }
 return {verified:false,source:null,racers:[],legacyReason:legacy.reason??null,groupedReason:grouped.reason??null,groupedTableAttempts:grouped.tableAttempts??null};
}
