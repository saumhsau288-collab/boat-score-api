// Research-only venue-specific RACER performance, not boat-number performance.
// Historical finish labels are grouped by authenticated racer ID from pre-race evidence.
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
export function summarizeVenueRacerPodiums(records,{minimumStarts=10}={}){
 if(!Array.isArray(records))throw new TypeError('records_must_be_array');
 if(!Number.isInteger(minimumStarts)||minimumStarts<1)throw Error('invalid_minimum_starts');
 const venues=Array.from({length:24},(_,i)=>String(i+1).padStart(2,'0'));
 const groups=new Map(venues.map(v=>[v,new Map()]));
 const seen=new Set();let rejected=0,acceptedRaces=0;
 for(const r of records){
  const gate=verifyHistoricalRaceJoin(r);
  const venue=String(r?.expected?.venue??'').padStart(2,'0');
  const key=[r?.expected?.date,venue,r?.expected?.race].join('|');
  if(!gate.eligible||!groups.has(venue)||seen.has(key)){rejected++;continue;}
  seen.add(key);acceptedRaces++;
  const racers=groups.get(venue);
  for(let i=0;i<6;i++){
   const racerId=String(r.scoreInputsByBoat[i].racerId);
   const finish=r.finishByBoat[i].finish;
   const entry=racers.get(racerId)??{racerId,starts:0,wins:0,podiums:0,finishSum:0};
   entry.starts++;entry.finishSum+=finish;
   if(finish===1)entry.wins++;
   if(finish<=3)entry.podiums++;
   racers.set(racerId,entry);
  }
 }
 return {status:'verified_venue_racer_podiums',acceptedRaces,rejected,
  venues:venues.map(venue=>({venue,racers:[...groups.get(venue).values()]
   .map(r=>({...r,winRate:r.wins/r.starts,podiumRate:r.podiums/r.starts,
    averageFinish:r.finishSum/r.starts,sufficientSample:r.starts>=minimumStarts}))
   .sort((a,b)=>b.starts-a.starts||a.racerId.localeCompare(b.racerId))})),
  eligibleForDeployment:false,
  warning:'Descriptive racer-specific venue records only. Historical podium outcomes must not be used as features for the same race; pre-cutoff rolling statistics and out-of-sample tests are required.'};
}
