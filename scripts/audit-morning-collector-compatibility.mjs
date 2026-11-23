// Research-only compatibility audit for existing entry and last-50 collector payloads.
// Never treats caller-provided "verified" flags as authenticated source evidence.
import {prepareMorningEvidenceFromOfficialEntry} from './prepare-morning-evidence-from-official-entry.mjs';
export function auditMorningCollectorCompatibility(bundle){
 const entry=bundle?.entry,official=entry?.official;
 const issues=[];
 if(!entry||typeof entry!=='object')issues.push('missing_entry');
 if(official?.racersVerified!==true)issues.push('racer_parser_unverified');
 if(official?.statsVerified!==true)issues.push('stats_parser_unverified');
 for(const [field,rows] of [['racersByBoat',official?.racersByBoat],['statsByBoat',official?.statsByBoat]]){
  if(!Array.isArray(rows)||rows.length!==6)issues.push(field+'_six_rows_required');
 }
 const last=bundle?.last50ByBoat;
 if(!Array.isArray(last)||last.length!==6)issues.push('last50_six_rows_required');
 if(!entry?.capturedAt||!entry?.cutoffAt)issues.push('capture_or_cutoff_missing');
 if(issues.length)return {compatible:false,issues,canImport:false,authenticatedCapture:false};
 const prepared=prepareMorningEvidenceFromOfficialEntry(entry,last);
 if(!prepared.ready)issues.push(prepared.reason);
 return {compatible:issues.length===0,issues,canImport:prepared.ready===true,
  authenticatedCapture:false,verifiedOfficialSources:false,
  morningMethodCount:prepared.ready?prepared.sealed.envelope.methodCount:0,
  note:'Compatibility only. Collector provenance and true 08:00 capture remain unverified.'};
}
