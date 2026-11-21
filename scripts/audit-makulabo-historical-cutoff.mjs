// Research-only historical cutoff gate. A capture timestamp alone is NOT evidence
// that source observations existed before a race or that last50 excludes that race.
export function auditMakulaboHistoricalCutoff({raceStartAt,sourcePublishedAt,sourceCaptureAt,
 sampleEndAt,publicationVerified=false,sampleEndVerified=false}={}){
 const issues=[];
 const parse=(value,key)=>{
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||
   !Number.isFinite(Date.parse(value))){issues.push('invalid_'+key);return null;}
  return Date.parse(value);
 };
 const race=parse(raceStartAt,'race_start');
 const published=parse(sourcePublishedAt,'source_publication');
 const captured=parse(sourceCaptureAt,'source_capture');
 const sampleEnd=parse(sampleEndAt,'sample_end');
 if(publicationVerified!==true)issues.push('publication_not_verified');
 if(sampleEndVerified!==true)issues.push('sample_end_not_verified');
 if(race!==null&&published!==null&&published>=race)issues.push('source_not_before_race');
 if(race!==null&&captured!==null&&captured>=race)issues.push('capture_not_before_race');
 if(race!==null&&sampleEnd!==null&&sampleEnd>=race)issues.push('sample_not_before_race');
 if(published!==null&&captured!==null&&published>captured)issues.push('publication_after_capture');
 if(sampleEnd!==null&&published!==null&&sampleEnd>published)issues.push('sample_after_publication');
 return {eligible:issues.length===0,issues,
  warning:'Caller-provided verification flags are not independent evidence; require trusted provenance before historical scoring.'};
}
