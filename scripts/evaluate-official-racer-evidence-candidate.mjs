// Research-only bridge from matched official race-entry evidence to candidate scoring.
// Incomplete factors remain incomplete; no score is fabricated.
import {adaptOfficialRaceEntryToEvidence} from './adapt-official-racer-evidence.mjs';
import {normalizeRacerEvidenceCandidate} from './normalize-racer-evidence-candidate.mjs';
import {scoreVerifiedPreRaceFactors} from './research-score-weights.mjs';
export function evaluateOfficialRacerEvidenceCandidate(input){
 const evidence=adaptOfficialRaceEntryToEvidence(input);
 if(!evidence.ready)return {ready:false,stage:'official_adapter',reason:evidence.reason,eligibleForDeployment:false};
 const normalized=normalizeRacerEvidenceCandidate(evidence);
 if(!normalized.ready)return {ready:false,stage:'factor_normalization',reason:normalized.reason,
  racerIdentities:evidence.racers.map(r=>({boat:r.boat,racerId:r.racerId})),
  missingByBoat:evidence.racers.map(r=>({boat:r.boat,racerId:r.racerId,missing:r.missing})),
  partialRows:normalized.partialRows??[],eligibleForDeployment:false};
 const scored=scoreVerifiedPreRaceFactors(normalized.rows);
 return {...scored,stage:'research_scoring',eligibleForDeployment:false};
}
