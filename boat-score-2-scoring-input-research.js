// Research-only bridge: verified official metrics to the scorer's input shape.
// No production imports and no fabricated values.
export function buildVerifiedScoringInputs(extraction) {
 if(!extraction?.verified||!Array.isArray(extraction.racers)||extraction.racers.length!==6)
  return {ready:false,reason:'official_six_racers_unverified',racers:[]};
 const seen=new Set(),ids=new Set(),out=[];
 for(const racer of extraction.racers){
  const {boat,racerId,nationalWinRate,localWinRate,motorTwoWinRate,averageSt}=racer;
  if(!Number.isInteger(boat)||boat<1||boat>6||!/^\d{4}$/.test(String(racerId))||
    seen.has(boat)||ids.has(racerId)||![nationalWinRate,localWinRate,motorTwoWinRate].every(Number.isFinite)||
    nationalWinRate<0||nationalWinRate>10||localWinRate<0||localWinRate>10||
    motorTwoWinRate<0||motorTwoWinRate>100||
    !(averageSt===null||(Number.isFinite(averageSt)&&averageSt>=0&&averageSt<=1)))
   return {ready:false,reason:'invalid_scoring_input',racers:[]};
  seen.add(boat);ids.add(racerId);
  const effectiveLocalWinRate=localWinRate===0?nationalWinRate:localWinRate;
  out.push({boat,racerId,nationalWinRate,localWinRate,effectiveLocalWinRate,
    racerWinRate:(nationalWinRate+effectiveLocalWinRate)/2,
    motorTwoWinRate,averageSt,averageStAvailable:averageSt!==null});
 }
 if(![1,2,3,4,5,6].every(b=>seen.has(b)))
  return {ready:false,reason:'incomplete_boats',racers:[]};
 return {ready:true,reason:null,racers:out.sort((a,b)=>a.boat-b.boat)};
}
