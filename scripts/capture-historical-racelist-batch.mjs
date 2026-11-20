// Research-only historical racelist retrieval. Does not assume that today's page
// reproduces every field as it existed before the race.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {officialRacelistUrl} from '../boat-score-2-official.js';
import {selectResearchOfficialMetrics} from './select-research-official-metrics.mjs';
export async function captureHistoricalRacelistBatch(selections,{fetcher=fetch,outputDir='prediction-captures'}={}){
 if(!Array.isArray(selections)||!selections.length||selections.length>24)throw Error('invalid_batch_size');
 const keys=selections.map(s=>[s.date,s.venue,s.race].join('|'));
 if(new Set(keys).size!==keys.length)throw Error('duplicate_selection');
 fs.mkdirSync(outputDir,{recursive:true});
 const results=[];
 for(const selection of selections){
  const url=officialRacelistUrl({...selection,venue:String(selection.venue).padStart(2,'0')});
  if(url.status!=='ok')throw Error('invalid_race_selection');
  const receivedAt=new Date().toISOString();
  let result={date:String(selection.date),venue:String(selection.venue).padStart(2,'0'),race:selection.race,
   status:'fetch_failed',sixRacersParsed:false,preRaceHistoricalValidityVerified:false,eligibleForCalibration:false};
  try{
   const response=await fetcher(url.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
   const finalUrl=new URL(response.url||url.url);
   const body=await response.text();
   if(!response.ok||finalUrl.protocol!=='https:'||finalUrl.hostname!=='www.boatrace.jp'||
    finalUrl.pathname!=='/owpc/pc/race/racelist'||!/text\/html/i.test(response.headers.get('content-type')||'')||
    Buffer.byteLength(body)>2_000_000)throw Error('invalid_official_response');
   const parsed=selectResearchOfficialMetrics(body);
   const prefix='research-historical-racelist-'+selection.date+'-'+String(selection.venue).padStart(2,'0')+'-'+selection.race;
   fs.writeFileSync(outputDir+'/'+prefix+'.html',body);
   result={...result,status:'official_racelist_source_captured',sourceUrl:url.url,finalUrl:finalUrl.toString(),
    responseSha256:crypto.createHash('sha256').update(body).digest('hex'),receivedAt,
    sixRacersParsed:parsed.verified===true,parserSource:parsed.source??null,
    parserReason:parsed.verified?null:(parsed.groupedReason??parsed.legacyReason),
    racers:parsed.verified?parsed.racers:[],preRaceHistoricalValidityVerified:false,eligibleForCalibration:false};
   fs.writeFileSync(outputDir+'/'+prefix+'.json',JSON.stringify(result,null,2)+'\n');
  }catch(e){result.error=String(e.message||e);}
  results.push(result);
  console.log(JSON.stringify({event:'historical_racelist_capture_progress',completed:results.length,total:selections.length,date:result.date,venue:result.venue,race:result.race,status:result.status,parsed:result.sixRacersParsed,error:result.error??null}));
 }
 const summary={status:'historical_racelist_research_batch',requested:results.length,
  captured:results.filter(r=>r.status==='official_racelist_source_captured').length,
  sixRacersParsed:results.filter(r=>r.sixRacersParsed).length,
  preRaceHistoricalValidityVerified:0,eligibleForCalibration:0,
  results:results.map(({racers,...rest})=>({...rest,racerCount:racers?.length??0}))};
 fs.writeFileSync(outputDir+'/research-historical-racelist-batch-summary.json',JSON.stringify(summary,null,2)+'\n');
 if(summary.captured===0)throw Error('historical_racelist_batch_zero_sources_captured');
 return summary;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const date=process.env.CAPTURE_DATE||'20261120';
 const venues=(process.env.CAPTURE_VENUES||'18').split(',').map(x=>x.trim().padStart(2,'0'));
 const races=(process.env.CAPTURE_RACES||'1,2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
 const selections=venues.flatMap(venue=>races.map(race=>({date,venue,race})));
 console.log(JSON.stringify(await captureHistoricalRacelistBatch(selections),null,2));
}
