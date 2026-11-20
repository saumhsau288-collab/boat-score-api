// Research-only interpretation of Makulabo's published sample description.
// Rows reflect up to the most recent 50 starts FROM THE LABELLED FRAME across venues,
// not 50 starts of the racer overall. Counts of 1 or 49 can be legitimate.
export function identifyMakulaboSampleScope(html){
 if(typeof html!=='string')return {verified:false,reason:'html_required'};
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/[\s\u3000]+/g,'');
 const documented=visible.includes('直近50走分を集計')&&
  visible.includes('その枠での走りが少ない選手はある分だけ')&&
  visible.includes('全場');
 return documented
  ?{verified:true,scope:'same_labelled_frame_recent_up_to_50_all_venues',
    fewerThan50Allowed:true,source:'makulabo_published_description',
    independentPreRaceAuthentication:false}
  :{verified:false,reason:'sample_scope_description_not_found',
    independentPreRaceAuthentication:false};
}
