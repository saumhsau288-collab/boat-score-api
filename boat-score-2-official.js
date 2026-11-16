// Isolated official BOATRACE racelist reader. Not yet deployed.
// Extracts only source-proven racer identifiers; no guessed statistics.
import {validateRaceSelection} from './boat-score-2-adapter.js';
export function officialRacelistUrl(selection){
 const v=validateRaceSelection(selection);
 if(!v.valid)return {status:'invalid_selection',invalid:v.invalid};
 const url=new URL('https://www.boatrace.jp/owpc/pc/race/racelist');
 url.searchParams.set('rno',String(Number(selection.race)));
 url.searchParams.set('jcd',String(selection.venue).padStart(2,'0'));
 url.searchParams.set('hd',String(selection.date));
 return {status:'ok',url:url.toString()};
}
export function parseOfficialRacerIds(html){
 if(typeof html!=='string'||html.length>2_000_000)return {verified:false,racers:[],reason:'invalid_html'};
 // Do not assign boat numbers based on link order; page may contain unrelated links.
 const matches=[...html.matchAll(/<a\b[^>]*href=["']([^"']*\/owpc\/pc\/data\/racersearch\/profile\?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
 const racers=matches.map(m=>{
   let id=null;
   try{id=new URL(m[1],'https://www.boatrace.jp').searchParams.get('toban');}catch{}
   const name=m[2].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
   return {racerId:id,name};
 }).filter(r=>/^\d{4}$/.test(r.racerId||'')&&r.name);
 const unique=[...new Map(racers.map(r=>[r.racerId,r])).values()];
 return {verified:false,racers:unique,reason:'boat_position_not_verified',
   uniqueRacerCount:unique.length};
}
export async function fetchOfficialRacelist(selection,fetcher=fetch){
 const target=officialRacelistUrl(selection);
 if(target.status!=='ok')return target;
 try{
   const response=await fetcher(target.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(9000)});
   if(!response.ok)return {status:'upstream_error',httpStatus:response.status,verified:false};
   const type=response.headers.get('content-type')||'';
   if(!/text\/html/i.test(type))return {status:'invalid_content_type',verified:false};
   const html=await response.text();
   const parsed=parseOfficialRacerIds(html);
   return {status:'fetched',source:target.url,...parsed};
 }catch(e){return {status:'fetch_failed',verified:false,error:String(e?.message||e)};}
}
