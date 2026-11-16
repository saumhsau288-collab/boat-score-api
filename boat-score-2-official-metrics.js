// Boat Score 2: strict per-boat official metric validation.
// Source adapters must supply values already extracted from an identified official row.
// No inference from page order, placeholder zeroes, or missing values.
const FIELDS=Object.freeze({
 nationalWinRate:{max:10,unit:'wins_per_10'},
 localWinRate:{max:10,unit:'wins_per_10'},
 motorTwoWinRate:{max:100,unit:'percent'}
});
export function validateOfficialMetrics(boats){
 if(!Array.isArray(boats)||boats.length!==6)
   return {verified:false,reason:'six_boats_required',racers:[]};
 const numbers=new Set(),ids=new Set(),racers=[];
 for(const b of boats){
   if(!Number.isInteger(b?.boat)||b.boat<1||b.boat>6||
     !/^\d{4}$/.test(String(b?.racerId??''))||
     typeof b?.name!=='string'||!b.name.trim()||
     b?.sourceVerified!==true)
     return {verified:false,reason:'identity_or_source_unverified',racers:[]};
   if(numbers.has(b.boat)||ids.has(String(b.racerId)))
     return {verified:false,reason:'duplicate_boat_or_racer',racers:[]};
   numbers.add(b.boat);ids.add(String(b.racerId));
   const metrics={};
   for(const [key,spec] of Object.entries(FIELDS)){
     const value=b[key];
     if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>spec.max)
       return {verified:false,reason:'missing_or_invalid_'+key,racers:[]};
     metrics[key]=value;
   }
   racers.push({boat:b.boat,racerId:String(b.racerId),name:b.name.trim(),...metrics});
 }
 return {verified:true,source:'official_racelist',racers:racers.sort((a,b)=>a.boat-b.boat)};
}
export const OFFICIAL_METRIC_UNITS=FIELDS;
