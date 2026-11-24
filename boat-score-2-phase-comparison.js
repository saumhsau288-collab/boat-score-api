// Research-only phase scoring comparison. Does not modify production scoring.
import {morningRacerScore} from './boat-score-2-morning.js';
import {evaluateRacer} from './boat-score-2-scoring.js';
const validST=x=>Number.isFinite(x)&&x>=0&&x<=0.4;
export function comparePhaseScores(racer){
 const legacyMorning=morningRacerScore(racer);
 const legacyPrestart=evaluateRacer(racer);
 const avgStart=racer?.startTiming, exhibitionST=racer?.exhibitionST;
 const missing=[];
 if(!validST(avgStart))missing.push('startTiming');
 if(!validST(exhibitionST))missing.push('exhibitionST');
 // Keep measurement and proposed effects explicit, without claiming calibrated gains.
 return {legacyMorning,legacyPrestart,phase:'comparison_only',
  st:{average:validST(avgStart)?avgStart:null,exhibition:validST(exhibitionST)?exhibitionST:null,missing},
  eligibleForSTStudy:missing.length===0&&legacyMorning.status==='evaluated'&&legacyPrestart.status==='evaluated',
  warning:'ST observations are not yet assigned a learned score weight. Research only.'};
}
