// Boat Score 2 standalone API adapter, separate from deployed worker.js.
// Deploy only after preview integration tests pass.
// This module accepts VERIFIED upstream values only; no synthetic predictions.
import {morningRaceScore} from './boat-score-2-morning.js';
import {classifyRace} from './boat-score-2-classification.js';
const venueValid=v=>/^([0][1-9]|1[0-9]|2[0-4])$/.test(String(v));
const dateValid=d=>{if(!/^20\d{6}$/.test(String(d)))return false;
 const y=+String(d).slice(0,4),m=+String(d).slice(4,6),day=+String(d).slice(6,8);
 const x=new Date(Date.UTC(y,m-1,day));
 return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===day;};
export function validateRaceSelection(selection){
 const {venue,date,race}=selection||{};
 const invalid=[];
 if(!venueValid(venue))invalid.push('venue');
 if(!dateValid(date))invalid.push('date');
 if(!/^(?:[1-9]|1[0-2])$/.test(String(race)))invalid.push('race');
 return {valid:invalid.length===0,invalid};
}
export function evaluateVerifiedPayload(payload){
 const selection=validateRaceSelection(payload);
 if(!selection.valid)return {status:'invalid_selection',invalid:selection.invalid};
 if(payload?.verified!==true)return {status:'unverified_source',reason:'source_not_verified'};
 if(payload?.phase==='morning'){
  return {venue:payload.venue,date:payload.date,race:Number(payload.race),
    ...morningRaceScore(payload.racers)};
 }
 if(payload?.phase==='prestart'){
  return {venue:payload.venue,date:payload.date,race:Number(payload.race),
    phase:'prestart',...classifyRace(payload.racers)};
 }
 return {status:'invalid_phase'};
}
