// Research-only validation of ORIGINAL six-racer feature inputs.
// Never reconstruct inputs from rankedScores or certify source authenticity.
const limits={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100};
export function validateSixRacerSourceInputs(value){
 const errors=[];
 if(!Array.isArray(value)||value.length!==6)return {status:'missing_original_inputs',errors:['six_racers_required']};
 const boats=new Set(),courses=new Set(),racerIds=new Set();
 for(const r of value){
  if(!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||boats.has(r.boat))errors.push('invalid_or_duplicate_boat');
  else boats.add(r.boat);
  if(!Number.isInteger(r?.course)||r.course<1||r.course>6||courses.has(r.course))errors.push('invalid_or_duplicate_course');
  else courses.add(r.course);
  if(!['string','number'].includes(typeof r?.racerId)||!String(r.racerId).trim()||racerIds.has(String(r.racerId)))errors.push('missing_or_duplicate_racer_id');
  else racerIds.add(String(r.racerId));
  for(const [field,max] of Object.entries(limits))
   if(typeof r?.[field]!=='number'||!Number.isFinite(r[field])||r[field]<0||r[field]>max)errors.push('invalid_'+field);
  if(typeof r?.startTiming!=='number'||!Number.isFinite(r.startTiming)||r.startTiming<0||r.startTiming>1)errors.push('invalid_startTiming');
 }
 return {status:errors.length?'incomplete_original_inputs':'complete_unverified_inputs',errors:[...new Set(errors)],
  originalInputsPresent:errors.length===0,authenticated:false};
}
