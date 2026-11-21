// Research-only: adapt a verified Makulabo/official join to the strict
// existing morning pipeline. Never treat an unverified heatmap as recent50.
export function verifiedRecent50ForMorning(officialValidation,makulaboJoin) {
 if(officialValidation?.verified!==true||makulaboJoin?.verified!==true||
    !Array.isArray(officialValidation.racers)||officialValidation.racers.length!==6||
    !Array.isArray(makulaboJoin.racers)||makulaboJoin.racers.length!==6)
  return {ready:false,reason:'sources_not_verified',recent50:[]};
 const official=new Map(officialValidation.racers.map(r=>[String(r.racerId),r]));
 const seen=new Set(),recent50=[];
 for(const r of makulaboJoin.racers){
  const id=String(r?.racerId??''),identity=official.get(id);
  if(!identity||seen.has(id)||identity.boat!==r.boat||
     !Number.isInteger(r.runs)||r.runs<=0||r.runs>50||
     !Number.isFinite(r.firstPlaceRate)||r.firstPlaceRate<0||r.firstPlaceRate>100)
   return {ready:false,reason:'identity_or_rate_invalid',recent50:[]};
  seen.add(id);
  recent50.push({racerId:id,winRate:r.firstPlaceRate,verified:true,sourceVerified:true});
 }
 return {ready:seen.size===6,reason:seen.size===6?null:'incomplete',recent50:seen.size===6?recent50:[]};
}
