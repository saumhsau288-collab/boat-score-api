// Research-only official result-page capture. Raw evidence, not verified finish positions.
import {createHash} from 'node:crypto';
import {validateRaceSelection} from '../boat-score-2-adapter.js';
export function officialResultUrl(selection){
 const normalized={...selection,venue:String(selection?.venue??'').padStart(2,'0')};
 const valid=validateRaceSelection(normalized);
 if(!valid.valid)return {status:'invalid_selection',invalid:valid.invalid};
 const url=new URL('https://www.boatrace.jp/owpc/pc/race/raceresult');
 url.searchParams.set('rno',String(Number(selection.race)));
 url.searchParams.set('jcd',normalized.venue);
 url.searchParams.set('hd',String(selection.date));
 return {status:'ok',url:url.toString()};
}
export async function captureOfficialResultEvidence(selection,fetcher=fetch,now=()=>new Date().toISOString(),includeRawHtml=false){
 const target=officialResultUrl(selection);
 if(target.status!=='ok')return {...target,verified:false,eligibleForCalibration:false};
 const requestedAt=now();
 try{
  const response=await fetcher(target.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
  const finalUrl=new URL(response.url||'about:blank'),expected=new URL(target.url);
  const sourceMatches=finalUrl.origin===expected.origin&&finalUrl.pathname===expected.pathname&&
   ['rno','jcd','hd'].every(k=>finalUrl.searchParams.getAll(k).length===1&&finalUrl.searchParams.get(k)===expected.searchParams.get(k))&&
   [...finalUrl.searchParams.keys()].every(k=>['rno','jcd','hd'].includes(k));
  const contentType=response.headers.get('content-type')||'';
  const html=await response.text();
  const receivedAt=now(),bodyBytes=Buffer.byteLength(html,'utf8');
  const acceptable=response.ok&&sourceMatches&&/text\/html/i.test(contentType)&&bodyBytes>0&&bodyBytes<=2_000_000;
  return {status:acceptable?'official_result_source_captured':'official_result_source_rejected',
   date:String(selection.date),venue:Number(selection.venue),race:Number(selection.race),
   sourceUrl:target.url,finalUrl:finalUrl.toString(),requestedAt,receivedAt,
   httpStatus:response.status,contentType,bodyBytes,
   responseSha256:createHash('sha256').update(html).digest('hex'),
   verified:false,officialResultVerified:false,eligibleForCalibration:false,
   finishByBoat:null,reason:acceptable?'raw_result_html_requires_six_racer_identity_and_finish_parser':'invalid_source_or_response',
   ...(acceptable&&includeRawHtml?{rawHtml:html}:{})};
 }catch(error){return {status:'official_result_fetch_failed',sourceUrl:target.url,requestedAt,
  errorType:error?.name||'Error',verified:false,eligibleForCalibration:false};}
}
