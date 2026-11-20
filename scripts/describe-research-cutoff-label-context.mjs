// Read-only diagnostics of cutoff label context, never authenticates the value.
export function describeResearchCutoffLabelContext(html){
 if(typeof html!=='string')return {status:'invalid_html',verified:false};
 const matches=[...html.matchAll(/締切予定時刻|締切予定|投票締切時刻/g)].slice(0,8);
 const snippets=matches.map(m=>{
  const around=html.slice(Math.max(0,m.index-350),Math.min(html.length,m.index+550));
  return {label:m[0],context:around.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim().slice(0,350)};
 });
 return {status:'label_context_only_not_authenticated',labelCount:matches.length,snippets,verified:false};
}
