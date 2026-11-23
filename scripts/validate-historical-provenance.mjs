// Research-only strict provenance gate. Boolean verification flags alone are insufficient.
export function validateHistoricalProvenance(row){
 const reasons=[];
 if(!row||typeof row!=='object')return {valid:false,reasons:['missing_row']};
 const captured=Date.parse(row.capturedAt),cutoff=Date.parse(row.cutoffAt);
 if(!Number.isFinite(captured)||!Number.isFinite(cutoff)||captured>=cutoff)reasons.push('capture_not_proven_before_cutoff');
 if(typeof row.scoreModelVersion!=='string'||!row.scoreModelVersion.trim())reasons.push('missing_score_model_version');
 if(typeof row.preRaceSourceUrl!=='string'||!/^https:\/\//.test(row.preRaceSourceUrl))reasons.push('missing_pre_race_source');
 if(typeof row.officialResultUrl!=='string'||!/^https:\/\//.test(row.officialResultUrl))reasons.push('missing_official_result_source');
 if(row.capturedBeforeCutoff!==true||row.officialResultVerified!==true)reasons.push('verification_flags_missing');
 return {valid:reasons.length===0,reasons};
}
