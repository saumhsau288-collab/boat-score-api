// Research only: compare saved pre-race win rates to independently verified finishes.
export function comparePreRaceWinRates(records) {
 const races=[];let rejected=0;
 for(const {snapshot:s,result:r} of records||[]){
  const sr=s?.racers,rr=r?.racers;
  const valid=s?.verified===true&&r?.independentlyVerified===true&&s.date===r.date&&s.venue===r.venue&&s.race===r.race&&
   /^20\d{6}$/.test(String(s.date))&&Number.isFinite(Date.parse(s.capturedAt))&&Number.isFinite(Date.parse(s.cutoffAt))&&
   /[+-]\d{2}:\d{2}$/.test(s.capturedAt)&&/[+-]\d{2}:\d{2}$/.test(s.cutoffAt)&&
   Date.parse(s.capturedAt)<Date.parse(s.cutoffAt)&&Array.isArray(sr)&&sr.length===6&&Array.isArray(rr)&&rr.length===6;
  if(!valid){rejected++;continue;}
  const ids=sr.map(x=>String(x.racerId));
  if(new Set(ids).size!==6||new Set(sr.map(x=>x.boat)).size!==6||
   !sr.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&x.statsVerified===true&&
    Number.isFinite(x.nationalWinRate)&&x.nationalWinRate>=0&&x.nationalWinRate<=10&&
    (x.localWinRate===null||Number.isFinite(x.localWinRate)&&x.localWinRate>=0&&x.localWinRate<=10))||
   !rr.every(x=>ids.includes(String(x.racerId))&&Number.isInteger(x.finish)&&x.finish>=1&&x.finish<=6&&
    sr.find(y=>String(y.racerId)===String(x.racerId))?.boat===x.boat)||
   new Set(rr.map(x=>x.finish)).size!==6){rejected++;continue;}
  const ordered=sr.map(x=>({boat:x.boat,racerId:String(x.racerId),
   averageWinRate:x.localWinRate===null?x.nationalWinRate:(x.nationalWinRate+x.localWinRate)/2,
   nationalOnly:x.localWinRate===null,finish:rr.find(y=>String(y.racerId)===String(x.racerId)).finish}))
   .sort((a,b)=>b.averageWinRate-a.averageWinRate||a.boat-b.boat);
  races.push({date:s.date,venue:s.venue,race:s.race,ordered,
   highestWon:ordered[0].finish===1,topThreePodium:ordered.slice(0,3).filter(x=>x.finish<=3).length});
 }
 return {races,eligibleRaces:races.length,rejectedRecords:rejected,
  highestWinRateWins:races.filter(x=>x.highestWon).length,
  topThreePodiumPlacements:races.reduce((n,x)=>n+x.topThreePodium,0),
  eligibleForWeightTuning:false,method:'pre_race_verified_average_national_local',
  warning:'Descriptive only; do not use post-race win rates or unverified finishes.'};
}
