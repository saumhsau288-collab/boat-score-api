// Checks each race-navigation link in the official cutoff table against its label.
// This is independent structural corroboration, not authentication.
export function inspectResearchDeadlineHeaderLinks(html,{date,venue}={}){
 if(typeof html!=='string'||!/^20\d{6}$/.test(String(date))||!Number.isInteger(venue)||venue<1||venue>24)
  return {status:'invalid_input',verified:false};
 const text=x=>x.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 for(const table of html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)){
  for(const row of table[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
   const cells=[...row[0].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(x=>x[1]);
   const last=cells.slice(-12);
   if(last.length!==12||!last.every((c,i)=>text(c)===(i+1)+'R'))continue;
   const issues=[];
   last.forEach((cell,i)=>{
    const href=cell.match(/href=["']([^"']+)["']/i)?.[1];
    if(!href){issues.push({race:i+1,reason:'missing_href'});return;}
    try{
     const u=new URL(href.replace(/&amp;/g,'&'),'https://www.boatrace.jp');
     if(u.hostname!=='www.boatrace.jp'||u.pathname!=='/owpc/pc/race/racelist'||
       u.searchParams.getAll('hd').length!==1||u.searchParams.get('hd')!==date||
       u.searchParams.getAll('jcd').length!==1||Number(u.searchParams.get('jcd'))!==venue||
       u.searchParams.getAll('rno').length!==1||Number(u.searchParams.get('rno'))!==i+1)
       issues.push({race:i+1,reason:'href_identity_mismatch'});
    }catch{issues.push({race:i+1,reason:'invalid_href'});}
   });
   return {status:issues.length?'header_links_inconsistent':'header_links_consistent_not_authenticated',issues,verified:false};
  }
 }
 return {status:'header_not_found',verified:false};
}
