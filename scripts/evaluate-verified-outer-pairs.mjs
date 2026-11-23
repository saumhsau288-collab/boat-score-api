// Safe research entrypoint: exclude duplicate race identities and weak provenance
// before evaluating any relatively outer course pair.
import {uniqueHistoricalRaces} from './unique-historical-races.mjs';
import {validateHistoricalProvenance} from './validate-historical-provenance.mjs';
import {auditAllOuterPairs} from './audit-all-outer-pairs.mjs';
export function evaluateVerifiedOuterPairs(rows,options={}){
 const unique=uniqueHistoricalRaces(rows);
 const accepted=[],provenanceRejections={};
 for(const row of unique.accepted){
  const validation=validateHistoricalProvenance(row);
  if(validation.valid)accepted.push(row);
  else for(const reason of validation.reasons)provenanceRejections[reason]=(provenanceRejections[reason]||0)+1;
 }
 return {inputRows:rows.length,identityRejected:unique.rejected,provenanceRejectedRows:unique.accepted.length-accepted.length,provenanceRejections,eligibleForAudit:accepted.length,audit:auditAllOuterPairs(accepted,options),warning:'Format and declared flags are checked, but timestamps and URLs are not independently authenticated. Do not claim historical predictive accuracy.'};
}
