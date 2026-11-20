// Research-only official beforeinfo evidence capture. No scoring or inferred values.
import {createHash} from 'node:crypto';
import {validateRaceSelection} from '../boat-score-2-adapter.js';
export function officialBeforeinfoUrl(selection){
 const normalized={...selection,venue:/^(?:[1-9]|1[0-9]|2[0-4])$/.test(String(selection?.venue))?
  String(selection.venue).padStart(2,'0'):selection?.venue};
 const valid=validateRaceSelection(normalized);
 if(!valid.valid)return {status:'invalid_selection',invalid:valid.invalid};
 const url=new URL('https://www.boatrace.jp/owpc/pc/race/beforeinfo');
 url.searchParams.set('rno',String(Number(selection.race)));
 url.searchParams.set('jcd',String(selection.venue).padStart(2,'0'));
 url.searchParams.set('hd',String(selection.date));
 return {status:'ok',url:url.toString()};
}
export async function captureOfficialBeforeinfo(selection,fetcher=fetch,now=()=>new Date().toISOString(),includeRawHtml=false){
 const target=officialBeforeinfoUrl(selection);
 if(target.status!=='ok')return {...target,verified:false,eligibleForCalibration:false};
 const requestedAt=now();
 try{
  const response=await fetcher(target.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
  const headersReceivedAt=now();
  // A missing response URL cannot independently prove which page supplied the bytes.
  const finalUrl=new URL(response.url||'about:blank');
  const expected=new URL(target.url);
  const sourceMatches=finalUrl.origin===expected.origin&&finalUrl.pathname===expected.pathname&&
   ['rno','jcd','hd'].every(k=>finalUrl.searchParams.getAll(k).length===1&&
    finalUrl.searchParams.get(k)===expected.searchParams.get(k))&&
   [...finalUrl.searchParams.keys()].every(k=>['rno','jcd','hd'].includes(k));
  const contentType=response.headers.get('content-type')||'';
  const html=await response.text();
  const receivedAt=now(); // Body completion, not just response headers.
  const bytes=Buffer.byteLength(html,'utf8');
  const acceptable=response.ok&&sourceMatches&&/text\/html/i.test(contentType)&&bytes>0&&bytes<=2_000_000;
  return {status:acceptable?'beforeinfo_source_captured':'beforeinfo_source_rejected',
   date:String(selection.date),venue:Number(selection.venue),race:Number(selection.race),
   sourceUrl:target.url,finalUrl:finalUrl.toString(),requestedAt,headersReceivedAt,receivedAt,
   httpStatus:response.status,contentType,bodyBytes:bytes,
   responseSha256:createHash('sha256').update(html).digest('hex'),
   verified:false,preRaceIndependentlyVerified:false,eligibleForCalibration:false,
   reason:acceptable?'raw_source_only_not_parsed_or_cutoff_verified':'source_identity_or_response_invalid',
   // No extraction without a separately tested six-boat parser and cutoff evidence.
   racers:[],weather:null,
   ...(acceptable&&includeRawHtml===true?{rawHtml:html}:{})};
 }catch(error){
  return {status:'beforeinfo_fetch_failed',sourceUrl:target.url,requestedAt,
   errorType:error?.name||'Error',verified:false,eligibleForCalibration:false};
 }
}
