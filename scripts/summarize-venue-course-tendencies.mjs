// Descriptive venue/course tendencies from independently verified race joins only.
// These are observed finish frequencies, not causal track effects.
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
export function summarizeVenueCourseTendencies(records,{minimumRaces=30}={}){
 if(!Array.isArray(records))throw new TypeError('records_must_be_array');
 const groups=Array.from({length:24},(_,i)=>({venue:String(i+1).padStart(2,'0'),races:0,
  boats:Array.from({length:6},(_,j)=>({boat:j+1,wins:0,podiums:0,starts:0}))}));
 const seen=new Set();let rejected=0;
 for(const r of records){
  const gate=verifyHistoricalRaceJoin(r);
  const venue=String(r?.expected?.venue??'').padStart(2,'0');
  const group=groups.find(g=>g.venue===venue);
  const key=[r?.expected?.date,venue,r?.expected?.race].join('|');
  if(!gate.eligible||!group||seen.has(key)){rejected++;continue;}
  seen.add(key);group.races++;
  for(const finish of r.finishByBoat){
   const boat=group.boats[finish.boat-1];
   boat.starts++;
   if(finish.finish===1)boat.wins++;
   if(finish.finish<=3)boat.podiums++;
  }
 }
 return {status:'descriptive_verified_venue_tendencies',rejected,
  venues:groups.map(g=>({...g,usableForResearch:g.races>=minimumRaces,
   boats:g.boats.map(b=>({...b,winRate:b.starts?b.wins/b.starts:null,podiumRate:b.starts?b.podiums/b.starts:null}))})),
  warning:'Boat-number finish rates are descriptive; entry-course changes, racer ability and weather require separate controls before attributing track-specific effects.',
  eligibleForDeployment:false};
}
