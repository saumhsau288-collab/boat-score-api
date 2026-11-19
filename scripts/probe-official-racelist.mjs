import {parseRacers} from '../research/boat-score-2-preview-worker.mjs';
const date=process.env.PROBE_DATE||'20261119',venue=Number(process.env.PROBE_VENUE||18),race=Number(process.env.PROBE_RACE||2);
const url='https://www.boatrace.jp/owpc/pc/race/racelist?'+new URLSearchParams({hd:date,jcd:String(venue).padStart(2,'0'),rno:String(race)});
try{
 const res=await fetch(url,{redirect:'follow',headers:{accept:'text/html'},signal:AbortSignal.timeout(15000)});
 const html=res.ok?await res.text():'';
 const racers=html.length<=2000000?parseRacers(html):null;
 const audit={date,venue,race,httpStatus:res.status,htmlBytes:html.length,tableRows:(html.match(/<tr\\b/gi)||[]).length,parsedSix:racers?.length===6,names:racers?.map(r=>({boat:r.boat,racerId:r.racerId,name:r.name}))??[],warning:'Public official racelist inspection only; no prediction or deploy'};
 console.log('OFFICIAL_RACELIST_PROBE',JSON.stringify(audit));
 if(!res.ok||!racers)process.exitCode=1;
}catch(e){console.log('OFFICIAL_RACELIST_PROBE',JSON.stringify({status:'fetch_failed',error:String(e.message).slice(0,150)}));process.exitCode=1;}
