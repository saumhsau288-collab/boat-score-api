// Research-only official racelist source probe. Never changes deployed Worker.
// A verified six-racer metric extraction is NOT verification of start time,
// actual entry, historical ST, exhibition or last-50 course podium.
import {officialRacelistUrl} from '../boat-score-2-official.js';
import {extractOfficialMetrics} from '../boat-score-2-metric-extractor.js';
import {extractGroupedOfficialSix} from './extract-grouped-official-six.mjs';
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';
import {adaptVerifiedOfficialMetricsToTwelve} from './adapt-verified-official-metrics-to-twelve.mjs';
export async function probeOfficialTwelveInputs(selection,fetcher=fetch){
 const target=officialRacelistUrl({...selection,venue:Number.isInteger(Number(selection?.venue))?String(selection.venue).padStart(2,'0'):selection?.venue});
 if(target.status!=='ok')return {status:'invalid_selection',details:target};
 const requestedAt=new Date().toISOString();
 try{
  const response=await fetcher(target.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(20000)});
  const receivedAt=new Date().toISOString();
  if(!response.ok)return {status:'upstream_error',sourceUrl:target.url,httpStatus:response.status,requestedAt,receivedAt};
  if(!/text\/html/i.test(response.headers.get('content-type')||''))return {status:'invalid_content_type',sourceUrl:target.url,requestedAt,receivedAt};
  const html=await response.text();
  if(html.length>2_000_000)return {status:'response_too_large',requestedAt,receivedAt};
  const initial=extractOfficialMetrics(html);
  const parsed=initial.verified?initial:extractGroupedOfficialSix(html);
  if(!parsed.verified)return {status:'insufficient_data',sourceUrl:target.url,reason:parsed.reason,initialReason:initial.reason,requestedAt,receivedAt};
  const checked=validateOfficialMetrics(parsed.racers);
  if(!checked.verified)return {status:'insufficient_data',reason:checked.reason,requestedAt,receivedAt};
  const adapted=adaptVerifiedOfficialMetricsToTwelve({official:parsed.racers});
  return {status:'mapped',sourceUrl:target.url,requestedAt,receivedAt,
   selection:{date:String(selection.date),venue:Number(selection.venue),race:Number(selection.race)},
   racers:adapted.racers,readiness:adapted.methodReadiness,
   independentlyAuthenticatedBeforeRace:false,officialCutoffVerified:false,
   warning:'Source parsing verified six-racer metrics only; not independently authenticated pre-race capture or a valid twelve-method historical trial.'};
 }catch(e){return {status:'fetch_failed',sourceUrl:target.url,error:String(e?.message||e),requestedAt,receivedAt:new Date().toISOString()};}
}
