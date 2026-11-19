import {parseRacers} from '../research/boat-score-2-preview-worker.mjs';
const date=process.env.PROBE_DATE||'20261119',venue=Number(process.env.PROBE_VENUE||18),race=Number(process.env.PROBE_RACE||2);
const url='https://www.boatrace.jp/owpc/pc/race/racelist?'+new URLSearchParams({hd:date,jcd:String(venue).padStart(2,'0'),rno:String(race)});
try{
 const res=await fetch(url,{redirect:'follow',headers:{accept:'text/html'},signal:AbortSignal.timeout(15000)});
 const html=res.ok?await res.text():'';
 const racers=html.length<=2000000?parseRacers(html):null;
 const makulaboUrl='https://makulabo-jp.com/data/'+String(venue).padStart(2,'0')+'/'+race+'/heatmap?hd='+date;
 let crossSource={status:'unavailable',matches:[]};
 try{
  const mak=await fetch(makulaboUrl,{headers:{accept:'text/html'},signal:AbortSignal.timeout(12000)});
  if(mak.ok&&racers){
   const body=await mak.text();
   const rows=[...body.matchAll(/<tr\\b[^>]*>([\\s\\S]*?)<\\/tr>/gi)].map(m=>[...m[1].matchAll(/<(?:td|th)\\b[^>]*>([\\s\\S]*?)<\\/(?:td|th)>/gi)].map(x=>x[1].replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').normalize('NFKC').trim()));
   const recent=rows.slice(1,7).map(row=>({boat:/^[1-6]$/.test(row[0])?Number(row[0]):null,name:row[1],finishCounts:row.slice(2,8).map(Number),starts:Number(row[8])}));
   const {matchMakulaboByName}=await import('../research/boat-score-2-preview-worker.mjs');
   const match=matchMakulaboByName(racers,recent);
   crossSource={status:match.verified?'six_name_and_boat_matches':'identity_unverified',reason:match.reason??null,registrationVerified:false,matches:match.matches.map(x=>({boat:x.boat,racerId:x.racerId,nameMatch:x.nameMatch,starts:x.record.starts,firstPlaceRatePct:Number((x.record.finishCounts[0]/x.record.starts*100).toFixed(2))}))};
  }else crossSource={status:'makulabo_or_official_unavailable',httpStatus:mak.status,matches:[]};
 }catch(e){crossSource={status:'fetch_error',error:String(e.message).slice(0,120),matches:[]};}
 const audit={date,venue,race,httpStatus:res.status,htmlBytes:html.length,tableRows:(html.match(/<tr\\b/gi)||[]).length,parsedSix:racers?.length===6,crossSource,names:racers?.map(r=>({boat:r.boat,racerId:r.racerId,name:r.name}))??[],warning:'Public official racelist inspection only; no prediction or deploy'};
 console.log('OFFICIAL_RACELIST_PROBE',JSON.stringify(audit));
 if(!res.ok||!racers)process.exitCode=1;
}catch(e){console.log('OFFICIAL_RACELIST_PROBE',JSON.stringify({status:'fetch_failed',error:String(e.message).slice(0,150)}));process.exitCode=1;}
