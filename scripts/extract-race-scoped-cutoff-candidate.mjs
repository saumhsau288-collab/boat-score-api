// Research-only: require an explicit race-local container before parsing cutoff text.
// No generic page-wide fallback. Does not authenticate official HTML or cutoff provenance.
import {extractOfficialCutoffCandidate} from './extract-official-cutoff-candidate.mjs';
export function extractRaceScopedCutoffCandidate(html,expected){
 if(typeof html!=='string'||!expected||!Number.isInteger(expected.race)||expected.race<1||expected.race>12)
  return {status:'invalid_input',verified:false};
 // Only explicitly marked containers qualify. This is a testable structural contract,
 // not a claim that the current BOAT RACE HTML uses these attributes.
 const blocks=[...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)]
  .filter(m=>/\bdata-boat-score-race\s*=\s*["']?\d{1,2}["']?/i.test(m[1]));
 const selected=blocks.filter(m=>{
  const id=m[1].match(/\bdata-boat-score-race\s*=\s*["']?(\d{1,2})["']?/i);
  return id&&Number(id[1])===expected.race;
 });
 if(selected.length!==1)return {status:selected.length?'ambiguous_race_container':'race_container_not_found',verified:false};
 const candidate=extractOfficialCutoffCandidate(selected[0][2],expected);
 return {...candidate,verified:false,scope:'explicit_race_container_unverified'};
}
