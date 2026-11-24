// Research-only comparison; production scoring remains unchanged.
import {morningRacerScore} from './boat-score-2-morning.js';
import {evaluateRacer} from './boat-score-2-scoring.js';
import {normalizeExhibitionST} from './scripts/normalize-exhibition-st.mjs';
const validST=x=>Number.isFinite(x)&&x>=0&&x<=0.4;
export function comparePhaseScores(racer){
 const legacyMorning=morningRacerScore(racer);
 const legacyPrestart=evaluateRacer(racer);
 const avgStart=racer?.startTiming;
 const exhibition=normalizeExhibitionST(racer?.exhibitionST);
 const missing=[];
 if(!validST(avgStart))missing.push('startTiming');
 if(['missing','invalid'].includes(exhibition.status))missing.push('exhibitionST');
 return {legacyMorning,legacyPrestart,phase:'comparison_only',
 st:{average:validST(avgStart)?avgStart:null,exhibition:exhibition.seconds,exhibitionStatus:exhibition.status,missing},
 eligibleForSTStudy:missing.length===0&&legacyMorning.status==='evaluated'&&legacyPrestart.status==='evaluated',
 warning:'Research only; no learned ST weight or production changes.'};
}
