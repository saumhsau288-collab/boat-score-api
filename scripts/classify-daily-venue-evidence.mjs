// Research-only official daily page classification. Never auto-filter from ambiguous HTML.
export function classifyDailyVenueEvidence(html,{date}={}){
 if(typeof html!=='string'||!/^20\d{6}$/.test(String(date||'')))throw new Error('Official HTML and YYYYMMDD date required');
 const candidates=[];
 const rx=/<a\b[^>]*href=["']([^"']*\/owpc\/pc\/race\/(?:racelist|index)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(rx)){
  const url=new URL(m[1].replace(/&amp;/g,'&'),'https://www.boatrace.jp');
  const venue=Number(url.searchParams.get('jcd')),hd=url.searchParams.get('hd');
  if(!Number.isInteger(venue)||venue<1||venue>24||hd!==date)continue;
  candidates.push({venue,link:url.toString()});
 }
 const venues=[...new Set(candidates.map(x=>x.venue))].sort((a,b)=>a-b);
 return {date,linkedVenues:venues,linkCount:candidates.length,verifiedActiveVenues:[],safeToFilterByActivity:false,authentication:'unverified_html_link_evidence',warning:'Matching links are candidate venue evidence only. Cancellations and official page identity must be independently checked before active-venue filtering.'};
}
