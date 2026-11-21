// Research-only: distinguish same-frame recent starts from overall win rate.
export function assessMakulaboFrameScope({joined,scope}={}){
 if(joined?.verified!==true||!Array.isArray(joined.racers)||joined.racers.length!==6)
  return {verified:false,reason:'six_verified_joined_racers_required',scoreChangeApplied:false};
 if(scope?.verified!==true||scope.scope!=='same_labelled_frame_recent_up_to_50_all_venues')
  return {verified:false,reason:'same_frame_sample_scope_required',scoreChangeApplied:false};
 const boats=joined.racers.map(r=>r?.boat);
 const ids=joined.racers.map(r=>String(r?.racerId??''));
 if(new Set(boats).size!==6||boats.some(b=>!Number.isInteger(b)||b<1||b>6)||
    new Set(ids).size!==6||ids.some(id=>!/^\d{4}$/.test(id)))
  return {verified:false,reason:'unique_boats_and_racer_ids_required',scoreChangeApplied:false};
 if(joined.racers.some(r=>!Number.isInteger(r.runs)||r.runs<1||r.runs>50||
   !Number.isFinite(r.firstPlaceRate)||r.firstPlaceRate<0||r.firstPlaceRate>100))
  return {verified:false,reason:'invalid_frame_sample_or_rate',scoreChangeApplied:false};
 return {verified:true,reason:'frame_specific_sample_only',
  featureName:'makulabo_same_frame_recent_up_to_50_first_place_rate',
  overallRecent50WinRate:false,independentPreRaceAuthentication:false,
  scoreChangeApplied:false};
}
