// Research-only ingestion of independently reviewed active-venue manifest.
// A manifest is not proof by itself; no automatic schedule inference or live requests.
import {planVerifiedVenueCapture} from './plan-verified-venue-capture.mjs';
const validDate=x=>typeof x==='string'&&/^20\d{6}$/.test(x);
export function planCaptureFromReviewedManifest(manifest,{requestedDate,maxRaces=12}={}){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('manifest_object_required');
 if(!validDate(requestedDate)||!validDate(manifest.date)||manifest.date!==requestedDate)throw Error('matching_verified_date_required');
 if(manifest.reviewed!==true||typeof manifest.reviewedAt!=='string'||!Number.isFinite(Date.parse(manifest.reviewedAt)))throw Error('independent_review_required');
 if(typeof manifest.sourceUrl!=='string'||!/^https:\/\//.test(manifest.sourceUrl))throw Error('schedule_source_url_required');
 if(!Array.isArray(manifest.activeVenues)||manifest.activeVenues.length===0)throw Error('active_venues_required');
 const plan=planVerifiedVenueCapture({verifiedActiveVenues:manifest.activeVenues,verificationDate:manifest.date,requestedDate,maxRaces});
 return {...plan,sourceUrl:manifest.sourceUrl,reviewedAt:manifest.reviewedAt,reviewed:true,warning:'Research-only manifest-based plan. Reviewed=true is a caller assertion, not independent verification by this software. Do not use without human/source audit.'};
}
