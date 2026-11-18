// Conservative identity checks for race-specific official HTML.
// Absence of explicit race/date/venue markers is not proof of a matching page.
export function inspectOfficialPageIdentity(html,{date,venue,race}){
 if(typeof html!=='string'||!/^20\d{6}$/.test(String(date))||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return {status:'invalid_input',verified:false};
 const normalized=html.replace(/&amp;/g,'&');
 const expectedDate=String(date);
 const dates=[...normalized.matchAll(/(?:[?&]hd=)(20\d{6})(?=[&#"'\s]|$)/g)].map(m=>m[1]);
 const races=[...normalized.matchAll(/(?:[?&]rno=)(1[0-2]|[1-9])(?=[&#"'\s]|$)/g)].map(m=>Number(m[1]));
 const venues=[...normalized.matchAll(/(?:[?&]jcd=)(\d{1,2})(?=[&#"'\s]|$)/g)].map(m=>Number(m[1]));
 if(!dates.length||!races.length||!venues.length)return {status:'identity_markers_missing',verified:false};
 if(!dates.includes(expectedDate)||!races.includes(race)||!venues.includes(venue))return {status:'identity_markers_mismatch',verified:false};
 if(dates.some(x=>x!==expectedDate)||races.some(x=>x!==race)||venues.some(x=>x!==venue))
  return {status:'identity_markers_ambiguous',verified:false};
 return {status:'identity_markers_consistent_not_authenticated',verified:false};
}
