// Research-only task planner. Requires externally verified active venue IDs.
// Never infer non開催 from a failed API response.
import {buildCaptureTasks} from './build-morning-capture-tasks.mjs';
export function planVerifiedVenueCapture({verifiedActiveVenues,maxRaces=12,verificationDate,requestedDate}){
 if(!/^20\d{6}$/.test(String(requestedDate))||verificationDate!==requestedDate)throw Error('matching_verified_date_required');
 if(!Array.isArray(verifiedActiveVenues)||verifiedActiveVenues.length===0)throw Error('verified_active_venues_required');
 const tasks=buildCaptureTasks(verifiedActiveVenues,maxRaces);
 return {date:requestedDate,verifiedActiveVenues:[...verifiedActiveVenues],planned:tasks.length,tasks,warning:'Research planning only. Caller must independently verify active venues and schedule provenance. This does not authorize live data access or modify the deployed application.'};
}
