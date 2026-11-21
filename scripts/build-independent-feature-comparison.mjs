// Research-only, no coefficient fitting: preserve feature provenance and missingness.
export function buildIndependentFeatureComparison({official=[],averageST=[],makulabo=[]}={}){
 const byST=new Map(averageST.map(x=>[x?.boat,x]));
 const byMakulabo=new Map(makulabo.map(x=>[x?.boat,x]));
 if(!Array.isArray(official)||official.length!==6||
    new Set(official.map(x=>x?.boat)).size!==6||
    official.some(x=>!Number.isInteger(x?.boat)||x.boat<1||x.boat>6))
  return {status:'held',reason:'six_unique_official_boats_required',rows:[],scoreChangeApplied:false};
 const rows=official.map(o=>{
  const st=byST.get(o.boat),mk=byMakulabo.get(o.boat);
  const national=Number.isFinite(o.nationalWinRate)?o.nationalWinRate:null;
  const localRaw=Number.isFinite(o.localWinRate)?o.localWinRate:null;
  const localForScoring=localRaw===0?national:localRaw;
  return {boat:o.boat,racerId:String(o.racerId??''),nationalWinRate:national,
   localWinRateRaw:localRaw,localWinRateForScoring:localForScoring,
   motor2Rate:Number.isFinite(o.motor2Rate)?o.motor2Rate:null,
   preRaceAverageST:st?.verified===true&&st?.kind==='pre_race_average_st'&&
      String(st.racerId)===String(o.racerId)&&Number.isFinite(st.value)?st.value:null,
   makulaboSameFrameFirstPlaceRate:mk?.verified===true&&mk?.scope==='same_labelled_frame_recent_up_to_50_all_venues'&&
      String(mk.racerId)===String(o.racerId)&&Number.isInteger(mk.runs)&&mk.runs>=1&&mk.runs<=50&&
      Number.isFinite(mk.firstPlaceRate)?mk.firstPlaceRate:null,
   makulaboSameFrameRuns:mk?.verified===true&&mk?.scope==='same_labelled_frame_recent_up_to_50_all_venues'&&
      String(mk.racerId)===String(o.racerId)&&Number.isInteger(mk.runs)&&mk.runs>=1&&mk.runs<=50?mk.runs:null};
 });
 return {status:'comparison_only',rows,eligibleForCalibration:false,scoreChangeApplied:false};
}
