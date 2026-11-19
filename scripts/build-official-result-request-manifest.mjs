// Research-only: prepare an official-result retrieval checklist from immutable saved captures.
// A URL is a retrieval target, NOT independently verified result evidence.
import fs from 'node:fs';
const keyOf=r=>{
 const date=String(r?.date??''),venue=Number(r?.venue),race=Number(r?.race);
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||
    !Number.isInteger(race)||race<1||race>12)return null;
 const yyyy=Number(date.slice(0,4)),mm=Number(date.slice(4,6)),dd=Number(date.slice(6));
 const d=new Date(Date.UTC(yyyy,mm-1,dd));
 if(d.getUTCFullYear()!==yyyy||d.getUTCMonth()+1!==mm||d.getUTCDate()!==dd)return null;
 return [date,venue,race].join(':');
};
export function buildOfficialResultRequestManifest(capture){
 if(!Array.isArray(capture?.records))throw Error('Capture records[] required');
 const keys=new Map(),invalid=[];
 for(let i=0;i<capture.records.length;i++){
  const row=capture.records[i],key=keyOf(row);
  if(!key){invalid.push(i);continue;}
  keys.set(key,(keys.get(key)||0)+1);
 }
 const requests=[...keys].sort(([a],[b])=>a.localeCompare(b)).map(([key,count])=>{
  const [date,venue,race]=key.split(':');
  const params=new URLSearchParams({rno:String(Number(race)),jcd:String(Number(venue)).padStart(2,'0'),hd:date});
  return {date,venue:Number(venue),race:Number(race),captureCount:count,
   duplicateCaptureKey:count>1,officialResultPageUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?'+params.toString(),
   resultVerified:false,officialCutoffVerified:false};
 });
 return {method:'official_result_request_manifest_only',requested:requests.length,
  invalidCaptureRows:invalid,duplicateKeys:requests.filter(r=>r.duplicateCaptureKey).length,
  verifiedResults:0,authenticatedPreRace:0,eligibleForAccuracy:0,requests,
  warning:'URLs are unverified retrieval targets. No official results were fetched or authenticated. Never infer historical hit rates from this manifest.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node scripts/build-official-result-request-manifest.mjs <saved-capture.json>');
 console.log(JSON.stringify(buildOfficialResultRequestManifest(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
