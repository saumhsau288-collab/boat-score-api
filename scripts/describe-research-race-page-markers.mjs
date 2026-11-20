// Read-only structural diagnostic. Do not authenticate a cutoff from navigation links.
export function describeResearchRacePageMarkers(html,{date,venue,race}={}){
 if(typeof html!=='string')return {status:'invalid_html'};
 const strip=x=>x.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
 const title=(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
 const headings=[...html.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map(x=>strip(x[1])).filter(Boolean).slice(0,15);
 const headingRaceMatches=headings.filter(x=>new RegExp('(?:^|\\D)'+race+'\\s*R(?:\\D|$)','i').test(x));
 const timeLabels=[...html.matchAll(/(?:締切予定時刻|締切予定|投票締切時刻)/g)].length;
 return {status:'structure_only_not_authenticated',title:strip(title).slice(0,180),headings,headingRaceMatches,timeLabelOccurrences:timeLabels,
  expected:{date,venue,race},verified:false};
}
