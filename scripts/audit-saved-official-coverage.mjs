// Research-only coverage join; never infer missing official races or alter scores.
export function auditSavedOfficialCoverage({savedRecords=[],officialRaces=[]}={}){
 const key=x=>[Number(x?.venue),Number(x?.race)].join('-');
 const saved=savedRecords.filter(x=>x?.response?.ready===true&&!(Number(x.venue)===9&&Number(x.race)===6));
 const byOfficial=new Map();
 for(const race of officialRaces){
  const k=key(race);
  if(byOfficial.has(k))return {status:'held',reason:'duplicate_official_race',scoreChangeApplied:false};
  byOfficial.set(k,race);
 }
 const rows=saved.map(record=>{
  const official=byOfficial.get(key(record));
  const ranked=record?.response?.rankedScores;
  const validOfficial=official?.comparison?.rows?.length===6;
  return {venue:Number(record.venue),race:Number(record.race),
   savedRankedScoresPresent:Array.isArray(ranked)&&ranked.length===6,
   officialSixBoatsPresent:validOfficial,
   officialCapturePreRaceVerified:official?.preRaceIndependentlyVerified===true,
   status:validOfficial?'comparison_available_retrospective_only':'official_capture_missing',
   eligibleForCalibration:false};
 });
 return {status:'coverage_only',savedRaceCount:saved.length,officialRaceCount:officialRaces.length,
  joinedRaceCount:rows.filter(r=>r.officialSixBoatsPresent).length,
  missingOfficialRaces:rows.filter(r=>!r.officialSixBoatsPresent).map(r=>({venue:r.venue,race:r.race})),
  rows,eligibleForCalibration:false,scoreChangeApplied:false};
}
