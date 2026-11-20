import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
// Research-only: capture exactly one explicit official page; no crawling or scoring.
export function validateOfficialRaceUrl(raw, expected) {
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.hostname!=='www.boatrace.jp'||u.username||u.password||u.port||u.hash)throw Error('non_official_url');
 if(!['/owpc/pc/race/raceindex','/owpc/pc/race/beforeinfo'].includes(u.pathname))throw Error('unsupported_page');
 if(u.searchParams.get('hd')!==expected.date||u.searchParams.get('jcd')!==expected.venue)throw Error('race_identity_mismatch');
 if(u.pathname.endsWith('/beforeinfo')&&u.searchParams.get('rno')!==String(expected.race))throw Error('race_identity_mismatch');
 if(u.pathname.endsWith('/raceindex')&&expected.race!==null)throw Error('raceindex_not_race_specific');
 return u;
}
export async function captureOfficialHtml({url,expected,fetchImpl=fetch,now=()=>new Date(),maxBytes=2000000}){
 validateOfficialRaceUrl(url,expected);
 const requestedAt=now().toISOString();
 const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'BoatScoreResearchEvidence/1.0'}});
 const receivedAt=now().toISOString();
 if(response.status!==200||response.redirected)throw Error('unexpected_response');
 const contentType=response.headers.get('content-type')??'';
 if(!/text\/html/i.test(contentType))throw Error('not_html');
 const body=Buffer.from(await response.arrayBuffer());
 if(body.length>maxBytes)throw Error('too_large');
 const sha256=createHash('sha256').update(body).digest('hex');
 const metadata={requestedAt,receivedAt,requestedUrl:url,finalUrl:response.url||url,httpStatus:response.status,contentType,byteLength:body.length,sha256,expected,cutoffVerified:false,raceIdentityVerified:false,note:'Raw capture only; identity and labeled cutoff require separate verification'};
 return {body,metadata};
}
export async function saveCapture({body,metadata,dir}){
 const folder=resolve(dir);await mkdir(folder,{recursive:true});
 const prefix=`${metadata.expected.date}-${metadata.expected.venue}-${metadata.expected.race??'index'}-${metadata.sha256.slice(0,12)}`;
 await writeFile(resolve(folder,prefix+'.html'),body,{flag:'wx'});
 await writeFile(resolve(folder,prefix+'.json'),JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});
 return prefix;
}
