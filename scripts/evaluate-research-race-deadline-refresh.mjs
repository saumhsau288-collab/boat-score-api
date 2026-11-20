// Research-only: bind a race-specific verified cutoff to the timing gate.
// Never convert an unverified HTML cutoff candidate into verified:true.
import {classifyDeadlineRefresh} from './classify-research-deadline-refresh.mjs';
export function evaluateRaceDeadlineRefresh({now,race,cutoffs,windowMinutes=2}={}){
 if(!race||!/^20\d{6}$/.test(String(race.date))||!Number.isInteger(race.venue)||race.venue<1||race.venue>24||!Number.isInteger(race.race)||race.race<1||race.race>12)
  return {status:'invalid_race_identity',eligible:false};
 if(!Array.isArray(cutoffs))return {status:'cutoff_evidence_required',eligible:false};
 const matches=cutoffs.filter(c=>c?.date===race.date&&c?.venue===race.venue&&c?.race===race.race);
 if(matches.length!==1)return {status:matches.length?'ambiguous_cutoff_evidence':'cutoff_evidence_missing',eligible:false};
 const c=matches[0];
 if(c.verified!==true)return {status:'official_cutoff_unverified',eligible:false};
 return classifyDeadlineRefresh({now,cutoff:c,windowMinutes});
}
