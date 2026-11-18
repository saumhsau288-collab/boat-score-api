// A successful HTTP response is not sufficient if an official page redirected elsewhere.
export function classifyOfficialResponseSource({requestedUrl,responseUrl,httpStatus,contentType}){
 let requested,actual;
 try {requested=new URL(requestedUrl);actual=new URL(responseUrl);}catch{return {status:'invalid_source_url',trustedDomain:false};}
 if(requested.protocol!=='https:'||requested.hostname!=='www.boatrace.jp')return {status:'unexpected_requested_source',trustedDomain:false};
 if(actual.protocol!=='https:'||actual.hostname!=='www.boatrace.jp')return {status:'redirected_off_official_domain',trustedDomain:false};
 if(actual.pathname!=='/owpc/pc/race/racelist')return {status:'unexpected_official_path',trustedDomain:false};
 for(const key of ['hd','jcd','rno']) {
  const expected=requested.searchParams.getAll(key);
  const observed=actual.searchParams.getAll(key);
  if(expected.length!==1||observed.length!==1||expected[0]!==observed[0])return {status:'official_race_query_changed',trustedDomain:true};
 }
 if(httpStatus!==200)return {status:'official_http_non_200',trustedDomain:true};
 if(!/text\/html/i.test(contentType||''))return {status:'unexpected_content_type',trustedDomain:true};
 return {status:'official_html_source_consistent_not_authenticated',trustedDomain:true};
}
