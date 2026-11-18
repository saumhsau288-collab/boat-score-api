// Conservative parsing of official race-list page cutoff text. Never infer an absent deadline.
export function extractOfficialCutoffCandidate(html,{date,venue,race}){
 if(typeof html!=='string'||!/^20\d{6}$/.test(String(date))||!Number.isInteger(venue)||!Number.isInteger(race))return {status:'invalid_input'};
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const matches=[...text.matchAll(/(?:締切予定時刻|締切予定|投票締切時刻|発売締切時刻)\s*[:：]?\s*([01]?\d|2[0-3])[:：]([0-5]\d)/g)];
 if(matches.length!==1)return {status:matches.length===0?'cutoff_not_found':'ambiguous_cutoff'};
 const [,hour,minute]=matches[0];
 const yyyy=String(date).slice(0,4),mm=String(date).slice(4,6),dd=String(date).slice(6,8);
 const utc=new Date(Date.UTC(+yyyy,+mm-1,+dd,+hour-9,+minute));
 const local=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(utc);
 const expected=yyyy+'-'+mm+'-'+dd;
 if(local!==expected)return {status:'invalid_date'};
 return {status:'candidate_needs_official_page_identity_verification',date,venue,race,localCutoff:hour.padStart(2,'0')+':'+minute,cutoffAt:utc.toISOString(),verified:false,source:'official_page_text_candidate'};
}
