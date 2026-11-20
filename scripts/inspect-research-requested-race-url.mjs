// Diagnostic only: distinguish expected page URL identity from navigation links.
// A URL match is necessary but not sufficient for authenticated official cutoff.
export function inspectResearchRequestedRaceUrl({requestedUrl,responseUrl,race}={}){
 if(!race||!/^20\d{6}$/.test(String(race.date))||!Number.isInteger(race.venue)||race.venue<1||race.venue>24||!Number.isInteger(race.race)||race.race<1||race.race>12)
  return {status:'invalid_race',verified:false};
 let requested,response;
 try{requested=new URL(requestedUrl);response=new URL(responseUrl);}catch{return {status:'invalid_url',verified:false};}
 for(const u of [requested,response]){
  if(u.protocol!=='https:'||u.hostname!=='www.boatrace.jp'||u.pathname!=='/owpc/pc/race/racelist')
   return {status:'unexpected_official_url',verified:false};
  if(u.searchParams.getAll('hd').length!==1||u.searchParams.get('hd')!==race.date||
    u.searchParams.getAll('jcd').length!==1||Number(u.searchParams.get('jcd'))!==race.venue||
    u.searchParams.getAll('rno').length!==1||Number(u.searchParams.get('rno'))!==race.race)
   return {status:'race_url_mismatch',verified:false};
 }
 return {status:'request_and_response_race_url_consistent_not_authenticated',verified:false};
}
