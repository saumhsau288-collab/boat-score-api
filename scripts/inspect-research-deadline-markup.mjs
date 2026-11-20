// Diagnostic only. Show structural tokens surrounding the deadline label.
// Do not infer that time sequence indexes correspond to race numbers.
export function inspectResearchDeadlineMarkup(html){
 if(typeof html!=='string')return {status:'invalid_html',verified:false};
 const at=html.indexOf('締切予定時刻');
 if(at<0)return {status:'label_missing',verified:false};
 const excerpt=html.slice(Math.max(0,at-1800),Math.min(html.length,at+2300));
 const tags=[...excerpt.matchAll(/<\/?(?:table|tr|td|th|ul|li|a|span|div)\b[^>]*>/gi)].map(m=>m[0].replace(/\s+/g,' ').slice(0,110));
 const nearbyRaces=[...excerpt.matchAll(/(?:^|>)\s*(1[0-2]|[1-9])R\s*(?=<|$)/gi)].map(m=>Number(m[1]));
 return {status:'markup_diagnostic_not_authenticated',nearbyRaceLabels:nearbyRaces,tagCount:tags.length,tagSample:tags.slice(0,45),verified:false};
}
