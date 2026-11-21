// Research-only selected result retrieval, with independent parser and identity checks.
// Never mark retrospective scores calibrated from one parsed HTML response.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {extractOfficialResultRacers} from './extract-official-result-racers.mjs';
import {crossCheckOfficialResultIdentity} from './cross-check-official-result-identity.mjs';
export async function captureSelectedResearchResult(snapshot,{fetchImpl=fetch}={}){
 const date=String(snapshot?.date??''),venue=Number(snapshot?.venue),race=Number(snapshot?.race);
 if(snapshot?.status!=='captured_research_inputs'||!Array.isArray(snapshot.racers)||
  snapshot.racers.length!==6||snapshot.source!=='verified_official_metrics'||
  snapshot.racers.some(r=>r?.sourceVerified!==true)||!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||
  venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
  return {status:'held',reason:'valid_official_snapshot_required',eligibleForCalibration:false};
 const url='https://www.boatrace.jp/owpc/pc/race/raceresult?'+
  new URLSearchParams({rno:String(race),jcd:String(venue).padStart(2,'0'),hd:date});
 try{
  const res=await fetchImpl(url,{redirect:'error',headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
  const contentType=res.headers.get('content-type')||'';
  if(!res.ok||!/text\/html/i.test(contentType))
   return {status:'held',reason:'official_result_response_unavailable',httpStatus:res.status,eligibleForCalibration:false};
  const html=await res.text();
  if(html.length<100||html.length>2_000_000)
   return {status:'held',reason:'invalid_result_html_size',eligibleForCalibration:false};
  const sha256=crypto.createHash('sha256').update(html).digest('hex');
  const page={date,venue,race,url,status:'raw_html_saved',html,sha256};
  const parsed=extractOfficialResultRacers({pages:[page]}).rows[0];
  const crossCheck=crossCheckOfficialResultIdentity(snapshot,parsed);
  return {status:crossCheck.status,reason:crossCheck.reason??null,date,venue,race,sourceUrl:url,sha256,
   parsedStatus:parsed.status,identityCheck:crossCheck,
   parsedPodium:crossCheck.status==='official_racelist_result_identity_matched'?parsed.podium:null,
   independentResultVerification:false,eligibleForCalibration:false,
   note:'Same-source identity agreement is not independent verification or proof of pre-race scoring.'};
 }catch(error){
  return {status:'held',reason:'official_result_fetch_failed',errorType:error?.name??'Error',eligibleForCalibration:false};
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/capture-selected-research-result.mjs official-snapshot.json result-output.json');
 const report=await captureSelectedResearchResult(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,reason:report.reason??null,parsedStatus:report.parsedStatus??null,
  parsedPodium:report.parsedPodium??null,independentResultVerification:false,eligibleForCalibration:false}));
}
