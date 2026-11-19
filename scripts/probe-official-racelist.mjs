import {parseRacers} from '../research/boat-score-2-preview-worker.mjs';
const date=process.env.PROBE_DATE||'20261119',venue=Number(process.env.PROBE_VENUE||18),race=Number(process.env.PROBE_RACE||2);
const url='https://www.boatrace.jp/owpc/pc/race/racelist?'+new URLSearchParams({hd:date,jcd:String(venue).padStart(2,'0'),rno:String(race)});
try{
 const res=await fetch(url,{redirect:'follow',headers:{accept:'text/html'},signal:AbortSignal.timeout(15000)});
 const html=res.ok?await res.text():'';
 const racers=html.length<=2000000?parseRacers(html):null;
 const racerRowDiagnostics=!racers?[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td\b(?=[^>]*\browspan\s*=\s*(?:[\"']4[\"']|4(?=\s|>)))[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,100))).filter(x=>x.length>=6).map(x=>x.slice(0,6)):[];
 const makulaboUrl='https://makulabo-jp.com/data/'+String(venue).padStart(2,'0')+'/'+race+'/heatmap?hd='+date;
 let crossSource={status:'unavailable',matches:[]};
 try{
  const mak=await fetch(makulaboUrl,{headers:{accept:'text/html'},signal:AbortSignal.timeout(12000)});
  if(mak.ok&&racers){
   const body=await mak.text();
   const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x=>x[1].replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').normalize('NFKC').trim()));
   const recent=rows.slice(1,7).map(row=>({boat:/^[1-6]$/.test(row[0])?Number(row[0]):null,name:row[1],finishCounts:row.slice(2,8).map(Number),starts:Number(row[8])}));
   const {matchMakulaboByName}=await import('../research/boat-score-2-preview-worker.mjs');
   const match=matchMakulaboByName(racers,recent);
   // Research-only before/after simulation; no verified 50-race window, never publish as live prediction.
   if(match.verified){
    const {rankRace}=await import('../research/boat-score-2-preview-worker.mjs');
    const baseline=rankRace(racers);
    const byBoat=new Map(match.matches.map(x=>[x.boat,x.record]));
    const weight=10;
    const adjusted=baseline.ranking.map(r=>{
     const row=byBoat.get(r.boat);
     const rate=row.finishCounts[0]/row.starts*100;
     return {boat:r.boat,beforeScore:r.score,publicCountFirstRatePct:Number(rate.toFixed(2)),afterScore:Number((r.score*(1-weight/100)+rate*weight/100).toFixed(3))};
    }).sort((a,b)=>b.afterScore-a.afterScore||a.boat-b.boat);
    const sensitivity=[0,5,10,15,20].map(w=>{
     const scores=baseline.ranking.map(r=>({boat:r.boat,score:Number((r.score*(1-w/100)+(byBoat.get(r.boat).finishCounts[0]/byBoat.get(r.boat).starts*100)*w/100).toFixed(3))})).sort((a,b)=>b.score-a.score||a.boat-b.boat);
     return {weightPct:w,rank:scores.map(r=>r.boat),topBoat:scores[0].boat,topScore:scores[0].score};
    });
    crossSource.scoreComparison={status:'provisional_research_only',weightPct:weight,sensitivity,beforeRank:baseline.ranking.map(r=>r.boat),afterRank:adjusted.map(r=>r.boat),scores:adjusted,warning:'Visible first-place counts are not independently verified as last 50 races; scores are not applied to the app.'};
   }
   crossSource={...crossSource,status:match.verified?'six_name_and_boat_matches':'identity_unverified',reason:match.reason??null,registrationVerified:false,matches:match.matches.map(x=>({boat:x.boat,racerId:x.racerId,nameMatch:x.nameMatch,starts:x.record.starts,firstPlaceRatePct:Number((x.record.finishCounts[0]/x.record.starts*100).toFixed(2))}))};
  }else crossSource={status:'makulabo_or_official_unavailable',httpStatus:mak.status,matches:[]};
 }catch(e){crossSource={status:'fetch_error',error:String(e.message).slice(0,120),matches:[]};}
 let resultAudit={status:'not_checked',verifiedFinish:[]};
 try{
  const resultUrl='https://www.boatrace.jp/owpc/pc/race/raceresult?'+new URLSearchParams({hd:date,jcd:String(venue).padStart(2,'0'),rno:String(race)});
  const resultResponse=await fetch(resultUrl,{headers:{accept:'text/html'},signal:AbortSignal.timeout(12000)});
  const resultHtml=resultResponse.ok?await resultResponse.text():'';
  const visible=resultHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
  const marker=visible.match(/(?:着順|レース結果|競走結果)/);
  const tables=[...resultHtml.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((m,i)=>({index:i,rows:[...m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x=>x[1].replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim()))}));
  const tableShape={count:tables.length,firstTables:tables.slice(0,5).map(t=>({index:t.index,rows:t.rows.length,firstRows:t.rows.slice(0,3).map(row=>row.slice(0,7).map(x=>x.slice(0,30)))}))};
  const tableAudit=tables.map(t=>({index:t.index,rowCount:t.rows.length,headers:t.rows.slice(0,2).map(row=>row.map(x=>x.slice(0,25))),firstRows:t.rows.slice(1,7).map(row=>row.slice(0,4).map(x=>x.slice(0,25)))})).filter(t=>t.headers.some(row=>row.some(x=>/着順|艇番|選手名|レース結果/.test(x)))).slice(0,3);
  const finishTables=tables.filter(t=>t.rows[0]?.[0]==='着'&&t.rows[0]?.[1]==='枠'&&t.rows[0]?.[2]==='ボートレーサー');
  const verifiedFinish=[];
  if(finishTables.length===1&&racers?.length===6){
   const used=new Set();
   for(const row of finishTables[0].rows.slice(1)){
    const place=Number((row[0]??'').normalize('NFKC'));
    const boat=Number((row[1]??'').normalize('NFKC'));
    const id=(row[2]??'').match(/(?:^|\s)(\d{4})(?=\s|$)/)?.[1];
    const racer=racers.find(r=>r.boat===boat&&r.racerId===id);
    if(!Number.isInteger(place)||place<1||place>6||!Number.isInteger(boat)||boat<1||boat>6||!racer||used.has(boat))continue;
    used.add(boat);
    verifiedFinish.push({place,boat,racerId:id,name:racer.name});
   }
  }
  verifiedFinish.sort((a,b)=>a.place-b.place);
  const topThreeVerified=verifiedFinish.length>=3&&[1,2,3].every((place,i)=>verifiedFinish[i].place===place);
  const actualTopThree=topThreeVerified?verifiedFinish.slice(0,3).map(r=>r.boat):[];
  const sensitivityBacktest=topThreeVerified?(crossSource.scoreComparison?.sensitivity?.map(item=>{
   const predictedTopThree=item.rank.slice(0,3);
   return {weightPct:item.weightPct,predictedTopThree,actualTopThree,firstPlaceCorrect:predictedTopThree[0]===actualTopThree[0],topThreeSetHits:predictedTopThree.filter(boat=>actualTopThree.includes(boat)).length,exactTopThreeOrder:predictedTopThree.join('-')===actualTopThree.join('-')};
  })??null):null;
  const predictionAudit=topThreeVerified&&crossSource.scoreComparison?{
   actualTopThree,sensitivityBacktest,baselineRank:crossSource.scoreComparison.beforeRank.slice(0,3),adjustedRank:crossSource.scoreComparison.afterRank.slice(0,3),
   baselineTopThreeSetHits:crossSource.scoreComparison.beforeRank.slice(0,3).filter(b=>actualTopThree.includes(b)).length,
   adjustedTopThreeSetHits:crossSource.scoreComparison.afterRank.slice(0,3).filter(b=>actualTopThree.includes(b)).length,
   baselineFirstCorrect:crossSource.scoreComparison.beforeRank[0]===actualTopThree[0],
   adjustedFirstCorrect:crossSource.scoreComparison.afterRank[0]===actualTopThree[0],
   warning:'Single-race exploratory comparison; ranking is not a trifecta ticket or a validated prediction rate.'
  }:null;
  resultAudit={status:resultResponse.ok?'page_fetched_not_yet_parsed':'http_error',httpStatus:resultResponse.status,htmlBytes:resultHtml.length,hasResultMarker:!!marker,tableShape,tableAudit,verifiedFinish,topThreeVerified,predictionAudit,warning:'No finish order inferred from generic text; requires structural parsing and racer-ID verification'};
 }catch(e){resultAudit={status:'fetch_error',error:String(e.message).slice(0,120),verifiedFinish:[]};}
 const audit={date,venue,race,httpStatus:res.status,htmlBytes:html.length,tableRows:(html.match(/<tr\b/gi)||[]).length,parsedSix:racers?.length===6,racerRowDiagnostics,crossSource,resultAudit,names:racers?.map(r=>({boat:r.boat,racerId:r.racerId,name:r.name}))??[],warning:'Public official racelist inspection only; no prediction or deploy'};
 console.log('OFFICIAL_RACELIST_PROBE',JSON.stringify(audit));
 if(!res.ok||!racers||!resultAudit.topThreeVerified)process.exitCode=1;
}catch(e){console.log('OFFICIAL_RACELIST_PROBE',JSON.stringify({status:'fetch_failed',error:String(e.message).slice(0,150)}));process.exitCode=1;}
