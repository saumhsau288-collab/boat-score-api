// Research-only adapter for existing verified beforeinfo parser outputs.
// No unverified weather adjustment or inferred entry order is permitted.
export function adaptOfficialBeforeinfoToRacerFields({startExhibition,exhibition,weather}={}){
 const validSix=x=>x?.verified===true&&Array.isArray(x.rows)&&x.rows.length===6&&
  new Set(x.rows.map(r=>r?.boat)).size===6&&x.rows.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6);
 if(!validSix(startExhibition)||!validSix(exhibition))return {ready:false,reason:'six_verified_beforeinfo_rows_required'};
 const courses=startExhibition.rows.map(r=>r.course);
 if(new Set(courses).size!==6||!courses.every(c=>Number.isInteger(c)&&c>=1&&c<=6))return {ready:false,reason:'invalid_start_exhibition_courses'};
 if(!exhibition.rows.every(r=>typeof r.exhibitionTime==='number'&&Number.isFinite(r.exhibitionTime)&&r.exhibitionTime>=5&&r.exhibitionTime<=9))return {ready:false,reason:'invalid_exhibition_times'};
 const byBoat=startExhibition.rows.map(r=>({boat:r.boat,expectedEntryCourse:r.course,
  exhibitionTime:exhibition.rows.find(x=>x.boat===r.boat)?.exhibitionTime??null,
  startExhibitionTiming:r.startTiming})).sort((a,b)=>a.boat-b.boat);
 if(byBoat.some(r=>r.exhibitionTime===null))return {ready:false,reason:'exhibition_boat_mismatch'};
 const weatherVerified=weather?.verified===true&&weather?.windDirectionVerified===true&&
  typeof weather.windSpeed==='number'&&Number.isFinite(weather.windSpeed)&&
  typeof weather.waveHeight==='number'&&Number.isFinite(weather.waveHeight);
 return {ready:true,byBoat,weather:weatherVerified?{windDirection:weather.windDirection,windSpeed:weather.windSpeed,waveHeight:weather.waveHeight}:null,
  weatherVerified,verifiedExhibitionAndWeather:null,
  note:'Start exhibition entry order is provisional; no calibrated weather-adjusted exhibition score is inferred.'};
}
