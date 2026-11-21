// Research-only: distinguish stored six-boat output scores from missing input features.
import {readFileSync} from 'node:fs';
export function auditCapturedRankedScores(capture){
 if(!capture||!Array.isArray(capture.records)||capture.authenticatedBeforeRace!==false)
  throw Error('invalid_capture_provenance');
 let ready=0,validScores=0,invalidScores=0;
 const cases=[];
 for(const record of capture.records){
  if(record.response?.ready!==true)continue;
  ready++;
  const rows=record.response.rankedScores;
  const valid=Array.isArray(rows)&&rows.length===6&&
   new Set(rows.map(r=>r?.boat)).size===6&&
   rows.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&
    typeof r.score==='number'&&Number.isFinite(r.score));
  if(valid)validScores++;else invalidScores++;
  cases.push({date:record.date,venue:record.venue,race:record.race,
   sixBoatOutputScoresPresent:valid,rawScoreInputsVerified:false,
   eligibleForCalibration:false});
 }
 return {scope:'CAPTURED_OUTPUT_SCORES_ONLY',readyResponses:ready,
  validSixBoatOutputScoreSets:validScores,invalidOrMissingScoreSets:invalidScores,
  rawScoreInputsVerified:0,officialResultsVerified:0,officialCutoffsVerified:0,
  eligibleForCalibration:false,cases,
  warning:'Six output scores are not the source feature inputs. Their presence does not establish verified race identity, cutoff timing, actual results, or weight-calibration eligibility.'};
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const path=process.argv[2];
 if(!path)throw Error('Usage: node scripts/audit-captured-ranked-scores.mjs capture.json');
 const result=auditCapturedRankedScores(JSON.parse(readFileSync(path,'utf8')));
 console.log(JSON.stringify(result,null,2));
}
