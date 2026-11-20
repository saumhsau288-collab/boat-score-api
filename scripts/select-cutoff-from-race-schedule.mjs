// Research-only: select cutoff from an explicitly parsed 12-race schedule row.
// Caller must separately authenticate official source and page identity.
export function selectCutoffFromRaceSchedule({expectedRace,raceNumbers,cutoffTimes,sourceVerified=false}={}){
 const fail=reason=>({verified:false,cutoffJst:null,reason});
 if(sourceVerified!==true)return fail('source_not_verified');
 if(!Number.isInteger(expectedRace)||expectedRace<1||expectedRace>12)return fail('invalid_race');
 if(!Array.isArray(raceNumbers)||!Array.isArray(cutoffTimes)||raceNumbers.length!==12||cutoffTimes.length!==12)return fail('incomplete_schedule');
 if(raceNumbers.some((x,i)=>x!==i+1))return fail('race_columns_mismatch');
 if(cutoffTimes.some(t=>typeof t!=='string'||!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(t)))return fail('invalid_cutoff_cell');
 return {verified:true,cutoffJst:cutoffTimes[expectedRace-1],reason:null};
}
