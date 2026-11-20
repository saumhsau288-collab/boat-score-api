// Research-only venue-specific calibration. No cross-venue leakage.
// A venue needs its own verified chronological history before changing weights.
import {evaluateWeightCandidates} from './evaluate-historical-weight-candidates.mjs';
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
const VENUES=Array.from({length:24},(_,i)=>String(i+1).padStart(2,'0'));
export function evaluateVenueSpecificWeights(records,{minTrain=100,minHoldout=30}={}){
 if(!Array.isArray(records))throw new TypeError('records_must_be_array');
 const groups=new Map(VENUES.map(v=>[v,[]]));
 const invalid=[];
 for(const record of records){
  const raw=String(record?.expected?.venue??'');
  if(!/^\d{1,2}$/.test(raw)||!groups.has(raw.padStart(2,'0'))){invalid.push('invalid_venue');continue;}
  groups.get(raw.padStart(2,'0')).push(record);
 }
 const venues=VENUES.map(venue=>{
  const rows=groups.get(venue);
  const report=evaluateWeightCandidates(rows,{minTrain,minHoldout});
  return {venue,submitted:rows.length,eligible:report.eligible??0,
   excluded:report.excluded??{},status:report.status,
   trainRaces:report.trainRaces??0,holdoutRaces:report.holdoutRaces??0,
   proposedResearchWeights:report.proposedResearchWeights??null,
   eligibleForDeployment:false};
 });
 return {status:'venue_specific_research_only',total:records.length,invalidRecords:invalid.length,
  totalVerifiedEligible:venues.reduce((n,v)=>n+v.eligible,0),
  venues,eligibleForDeployment:false,
  warning:'Each venue requires its own authenticated pre-cutoff score and six official finish positions. No venue-specific weight is deployed automatically.'};
}
