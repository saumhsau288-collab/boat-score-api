// Research-only six-racer feature snapshot validator.
// This validates independently collected input evidence; it does not fetch or infer missing values.
const required=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore','startTiming'];
const limits={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100,startTiming:2};
const timestamp=s=>typeof s==='string'&&/T\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s));
export function validateFeatureSnapshot(snapshot){
 const errors=[];
 if(!/^20\d{6}$/.test(String(snapshot?.date??'')))errors.push('invalid_date');
 if(!Number.isInteger(snapshot?.venue)||snapshot.venue<1||snapshot.venue>24||!Number.isInteger(snapshot?.race)||snapshot.race<1||snapshot.race>12)errors.push('invalid_race');
 if(!timestamp(snapshot?.capturedAt))errors.push('missing_capture_timestamp');
 if(!timestamp(snapshot?.officialCutoffAt))errors.push('missing_official_cutoff');
 if(!snapshot?.officialCutoffSourceUrl||!/^https:\/\/www\.boatrace\.jp\//.test(snapshot.officialCutoffSourceUrl))errors.push('missing_official_cutoff_source');
 if(!Array.isArray(snapshot?.racers)||snapshot.racers.length!==6)errors.push('six_racers_required');
 else{
  const boats=snapshot.racers.map(r=>r?.boat);
  if(new Set(boats).size!==6||boats.some(b=>!Number.isInteger(b)||b<1||b>6))errors.push('invalid_boat_ids');
  const ids=snapshot.racers.map(r=>r?.racerId);
  if(new Set(ids).size!==6||ids.some(id=>!/^\d{4}$/.test(String(id??''))))errors.push('invalid_racer_ids');
  const courses=snapshot.racers.map(r=>r?.entryCourse);
  if(new Set(courses).size!==6||courses.some(c=>!Number.isInteger(c)||c<1||c>6))errors.push('invalid_entry_courses');
  for(const r of snapshot.racers)for(const field of required){
   const v=r?.[field];
   if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>limits[field])errors.push('invalid_'+field);
   if(typeof r?.sources?.[field]!=='string'||!/^https:\/\//.test(r.sources[field]))errors.push('missing_source_'+field);
  }
 }
 const timingCandidate=timestamp(snapshot?.capturedAt)&&timestamp(snapshot?.officialCutoffAt)&&Date.parse(snapshot.capturedAt)<Date.parse(snapshot.officialCutoffAt);
 if(!timingCandidate)errors.push('capture_before_cutoff_not_established');
 return {structurallyComplete:errors.length===0,timingCandidate,independentlyAuthenticated:false,calibrationEligible:false,errors:[...new Set(errors)],warning:'A structurally complete snapshot is not proof of independent pre-race authenticity or verified results.'};
}
