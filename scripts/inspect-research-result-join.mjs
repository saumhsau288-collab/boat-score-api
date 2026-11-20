// Research-only result identity join. A structurally parsed HTML result is not
// independently authenticated official finish evidence.
import {verifyOfficialResultEvidencePair} from './verify-official-result-evidence-pair.mjs';
import {parseOfficialResultFinishRows} from './parse-official-result-finish-rows.mjs';
export function inspectResearchResultJoin({metadata,html,expected,scoreInputsByBoat}={}){
 const fail=(reason,details={})=>({status:'held',reason,matchedBoats:0,eligibleForWeightTuning:false,...details});
 const pair=verifyOfficialResultEvidencePair(metadata,html);
 if(pair.status!=='evidence_pair_valid')return fail('result_evidence_pair_invalid',{pair});
 const parsed=parseOfficialResultFinishRows(html);
 if(!parsed.verified)return fail('six_finish_rows_not_verified',{parserReason:parsed.reason});
 if(!expected||String(expected.date)!==String(metadata.date)||
  Number(expected.venue)!==Number(metadata.venue)||Number(expected.race)!==Number(metadata.race))
  return fail('race_identity_mismatch');
 if(!Array.isArray(scoreInputsByBoat)||scoreInputsByBoat.length!==6||
  scoreInputsByBoat.some((r,i)=>r?.boat!==i+1||!/^\d{4}$/.test(String(r?.racerId??'')))||
  new Set(scoreInputsByBoat.map(r=>String(r.racerId))).size!==6)
  return fail('six_scored_racers_missing');
 const mismatches=parsed.finishByBoat.filter((r,i)=>r.racerId!==String(scoreInputsByBoat[i].racerId));
 if(mismatches.length)return fail('racer_identity_mismatch',{mismatchBoats:mismatches.map(r=>r.boat)});
 return {status:'structural_match_only',reason:'result_html_not_independently_authenticated',
  matchedBoats:6,finishByBoat:parsed.finishByBoat,eligibleForWeightTuning:false,
  officialResultVerified:false,warning:'Do not convert parsed rows to verified finish records without independent result authentication.'};
}
