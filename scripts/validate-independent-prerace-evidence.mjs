// Research-only gate for immutable pre-race feature evidence.
// Never reconstruct missing features from a ranking or post-race data.
const isFiniteNumber = x => typeof x === 'number' && Number.isFinite(x);
const validDate = x => /^20\d{6}$/.test(String(x));
const jstDate = iso => new Date(Date.parse(iso) + 9*3600000).toISOString().slice(0,10).replace(/-/g,'');
export function validatePreRaceEvidence(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return {eligible:false,errors:['missing_record']};
  if (!validDate(record.date) || !Number.isInteger(record.venue) || record.venue<1 || record.venue>24 ||
      !Number.isInteger(record.race) || record.race<1 || record.race>12) errors.push('invalid_race_key');
  const captured=Date.parse(record.capturedAt), cutoff=Date.parse(record.officialCutoffAt);
  if (!Number.isFinite(captured) || !Number.isFinite(cutoff) || captured>=cutoff ||
      (Number.isFinite(captured) && validDate(record.date) && jstDate(record.capturedAt)!==String(record.date)) ||
      (Number.isFinite(cutoff) && validDate(record.date) && jstDate(record.officialCutoffAt)!==String(record.date)))
    errors.push('unverified_pre_cutoff_timing');
  if (record.cutoffSourceVerified!==true || record.captureSourceVerified!==true) errors.push('unverified_provenance');
  if (typeof record.modelVersion!=='string' || !record.modelVersion.trim()) errors.push('missing_model_version');
  const racers=record.racers;
  if (!Array.isArray(racers) || racers.length!==6 || new Set(racers.map(x=>x?.boat)).size!==6 ||
      new Set(racers.map(x=>x?.racerId)).size!==6 ||
      racers.some(r=>!r || !Number.isInteger(r.boat) || r.boat<1 || r.boat>6 ||
        !(typeof r.racerId==='string' || Number.isInteger(r.racerId)) || !String(r.racerId).trim()))
    errors.push('invalid_six_racer_identity');
  if (Array.isArray(racers) && racers.length===6) {
    const courses=racers.map(r=>r?.entryCourse);
    if (courses.some(c=>!Number.isInteger(c)||c<1||c>6)||new Set(courses).size!==6)
      errors.push('unverified_entry_courses');
    const numeric=['nationalRate','localRate','averageST','motor2Rate','exhibitionTime','last50CoursePodiumRate'];
    if (racers.some(r=>!r || numeric.some(k=>!isFiniteNumber(r[k]))))
      errors.push('missing_six_racer_features');
  }
  if (!record.featureSource || typeof record.featureSource!=='string') errors.push('missing_feature_source');
  return {eligible:errors.length===0,errors};
}
export function evaluateEvidenceBatch(records) {
  if (!Array.isArray(records)) throw Error('Expected array');
  const seen=new Set(), accepted=[], held=[];
  for(const record of records){
    const key=[record?.date,record?.venue,record?.race].join(':');
    const result=validatePreRaceEvidence(record);
    if(seen.has(key))result.errors.push('duplicate_race');
    seen.add(key);
    (result.errors.length?held:accepted).push({key,...result});
  }
  return {total:records.length,eligibleCount:accepted.length,heldCount:held.length,accepted,held,
    note:'Provenance flags are assertions; independent source verification is still required. No accuracy estimate.'};
}
