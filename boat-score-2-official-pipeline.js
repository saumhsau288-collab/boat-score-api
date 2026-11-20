// Boat Score 2: connect official fetched HTML to the verified morning pipeline.
// This is an isolated module; it does not change the deployed Worker.
import {officialRacelistUrl} from './boat-score-2-official.js';
import {extractOfficialMetrics} from './boat-score-2-metric-extractor.js';
import {validateOfficialMetrics} from './boat-score-2-official-metrics.js';
import {evaluateMorningFromSources} from './boat-score-2-morning-pipeline.js';
export async function inspectOfficialMetricsPage(selection,fetcher=fetch){
 const target=officialRacelistUrl(selection);
 if(target.status!=='ok')return target;
 try{
  const response=await fetcher(target.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(9000)});
  if(!response.ok)return {status:'upstream_error',httpStatus:response.status};
  if(!/text\/html/i.test(response.headers.get('content-type')||''))
   return {status:'invalid_content_type'};
  const html=await response.text();
  if(html.length>2_000_000)return {status:'response_too_large'};
  const parsed=extractOfficialMetrics(html);
  if(!parsed.verified)return {status:'insufficient_data',source:'official',reason:parsed.reason,
   diagnostics:parsed.diagnostics};
  const checked=validateOfficialMetrics(parsed.racers);
  if(!checked.verified)return {status:'insufficient_data',source:'official',reason:checked.reason};
  return {status:'official_verified',venue:selection.venue,date:selection.date,
   race:Number(selection.race),source:target.url,racers:parsed.racers};
 }catch(error){return {status:'fetch_failed',error:String(error?.message||error)};}
}
export async function evaluateMorningFromOfficialPage(selection,recent50,fetcher=fetch){
 const result=await inspectOfficialMetricsPage(selection,fetcher);
 if(result.status!=='official_verified')return result;
 return {venue:result.venue,date:result.date,race:result.race,
  ...evaluateMorningFromSources({official:result.racers,recent50})};
}
