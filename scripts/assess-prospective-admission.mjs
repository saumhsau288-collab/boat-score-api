import {prepareStrictProspectiveSnapshot} from './prepare-strict-prospective-snapshot.mjs';
// Require separately documented source verification before admitting a capture
// into prospective evaluation. Format validation alone never authenticates data.
export function assessProspectiveAdmission(input,verification){
 let prepared;
 try{prepared=prepareStrictProspectiveSnapshot(input);}catch(error){return {admitted:false,reason:'invalid_capture',details:String(error.message)};}
 if(!prepared.readyForReview)return {admitted:false,reason:'incomplete_capture',errors:prepared.errors};
 if(!verification||verification.verified!==true)return {admitted:false,reason:'source_not_verified'};
 if(verification.sourceUrl!==input.sourceUrl)return {admitted:false,reason:'source_mismatch'};
 if(typeof verification.verifiedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(verification.verifiedAt)||!Number.isFinite(Date.parse(verification.verifiedAt)))return {admitted:false,reason:'verification_timestamp_missing'};
 if(Date.parse(verification.verifiedAt)<Date.parse(prepared.snapshot.capturedAt))return {admitted:false,reason:'verification_before_capture'};
 if(Date.parse(verification.verifiedAt)>=Date.parse(prepared.snapshot.scheduledStartAt))return {admitted:false,reason:'verification_after_start'};
 if(typeof verification.method!=='string'||!verification.method.trim())return {admitted:false,reason:'verification_method_missing'};
 return {admitted:true,snapshot:prepared.snapshot,verification:{sourceUrl:verification.sourceUrl,verifiedAt:verification.verifiedAt,method:verification.method},warning:'Source verification is asserted by an external review; this function cannot independently authenticate external records.'};
}
