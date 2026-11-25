import {buildProspectiveRaceRecord} from './build-prospective-race-record.mjs';
import {validateProspectiveSnapshot} from './validate-prospective-snapshot.mjs';
// Bridge the lightweight capture format to the existing strict validation gate.
// Never claim source verification: the caller must separately verify authenticity.
export function prepareStrictProspectiveSnapshot(input){
 if(!Number.isInteger(input?.venue)||input.venue<1||input.venue>24)throw new Error('numeric venue 1..24 required');
 if(typeof input.sourceUrl!=='string'||!/^https:\/\//.test(input.sourceUrl))throw new Error('https sourceUrl required');
 const record=buildProspectiveRaceRecord({...input,venue:String(input.venue),source:input.sourceUrl});
 const snapshot={date:record.date,venue:input.venue,race:record.race,capturedAt:record.preRaceSnapshot.capturedAt,scheduledStartAt:record.preRaceSnapshot.scheduledStartAt,sourceUrl:input.sourceUrl,racers:record.racers};
 const checked=validateProspectiveSnapshot(snapshot);
 return {readyForReview:checked.valid,errors:checked.errors,snapshot,sourceVerified:false,warning:'Validation confirms structure/timing only. It does not authenticate the data source or record a live capture.'};
}
