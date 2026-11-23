// Research-only ingestion of independently reviewed active-venue manifest.
// A manifest is not proof by itself; no automatic schedule inference or live requests.
import {planVerifiedVenueCapture} from './plan-verified-venue-capture.mjs';
const validDate=x=>typeof x==='string'&&/^20\d{6}$/.test(x);
export function planCaptureFromReviewedManifest(manifest,{requestedDate,maxRaces=12,asOf}={}){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('manifest_object_required');
 if(!validDate(requestedDate)||!validDate(manifest.date)||manifest.date!==requestedDate)throw Error('matching_verified_date_required');
 if(manifest.reviewed!==true||typeof manifest.reviewedAt!=='string'||!Number.isFinite(Date.parse(manifest.reviewedAt)))throw Error('independent_review_required');
 if(typeof manifest.sourceUrl!=='string'||!/^https:\/\//.test(manifest.sourceUrl))throw Error('schedule_source_url_required');
 const reviewMs=Date.parse(manifest.reviewedAt);
 if(typeof asOf!=='string'||!Number.isFinite(Date.parse(asOf)))throw Error('capture_as_of_required');
 const startMs=Date.parse(requestedDate.slice(0,4)+'-'+requestedDate.slice(4,6)+'-'+requestedDate.slice(6,8)+'T00:00:00+09:00');
 if(!Number.isFinite(startMs)||new Date(startMs+9*3600000).toISOString().slice(0,10).replace(/-/g,'')!==requestedDate)throw Error('invalid_schedule_date');
 if(reviewMs>startMs+24*3600000||reviewMs<startMs-7*24*3600000)throw Error('review_outside_schedule_window');
 if(reviewMs>Date.parse(asOf))throw Error('review_after_capture_as_of');
 if(!Array.isArray(manifest.activeVenues)||manifest.activeVenues.length===0)throw Error('active_venues_required');
 const plan=planVerifiedVenueCapture({verifiedActiveVenues:manifest.activeVenues,verificationDate:manifest.date,requestedDate,maxRaces});
 return {...plan,sourceUrl:manifest.sourceUrl,reviewedAt:manifest.reviewedAt,reviewed:true,warning:'Research-only manifest-based plan. Reviewed=true is a caller assertion, not independent verification by this software. Do not use without human/source audit.'};
}
