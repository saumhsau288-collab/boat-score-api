// Read-only diagnostic: compare the requested race URL with the HTML page's
// own canonical/og:url references. Navigation links are intentionally ignored.
export function inspectResearchCanonicalRaceIdentity(html,{race}={}){
 if(typeof html!=='string'||!race||!/^20\d{6}$/.test(String(race.date))||!Number.isInteger(race.venue)||!Number.isInteger(race.race))
  return {status:'invalid_input',verified:false};
 const tags=[...html.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map(m=>m[0]);
 const urls=[];
 for(const tag of tags){
  const canonical=/\brel\s*=\s*["']canonical["']/i.test(tag);
  const og=/\bproperty\s*=\s*["']og:url["']/i.test(tag);
  if(!canonical&&!og)continue;
  const attr=canonical?'href':'content';
  const match=tag.match(new RegExp('\\b'+attr+'\\s*=\\s*["\\x27]([^"\\x27]+)["\\x27]','i'));
  if(match)urls.push(match[1].replace(/&amp;/g,'&'));
 }
 if(!urls.length)return {status:'canonical_identity_missing',verified:false};
 const identities=[];
 for(const raw of urls){
  let u;try{u=new URL(raw);}catch{return {status:'invalid_canonical_url',verified:false};}
  if(u.protocol!=='https:'||u.hostname!=='www.boatrace.jp'||u.pathname!=='/owpc/pc/race/racelist')
   return {status:'unexpected_canonical_url',verified:false};
  if(['hd','jcd','rno'].some(k=>u.searchParams.getAll(k).length!==1))
   return {status:'canonical_race_query_missing',verified:false};
  identities.push({date:u.searchParams.get('hd'),venue:Number(u.searchParams.get('jcd')),race:Number(u.searchParams.get('rno'))});
 }
 if(identities.some(x=>x.date!==race.date||x.venue!==race.venue||x.race!==race.race))
  return {status:'canonical_race_mismatch',verified:false};
 return {status:'canonical_race_consistent_not_authenticated',verified:false};
}
