#!/usr/bin/env node
// Validate raw official result evidence without pretending to verify finishing positions.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export function verifyOfficialResultEvidencePair(metadata,html){
 const hashValid=typeof metadata?.responseSha256==='string'&&/^[a-f0-9]{64}$/.test(metadata.responseSha256)&&
  metadata.responseSha256===createHash('sha256').update(html).digest('hex');
 const sizeValid=metadata?.bodyBytes===Buffer.byteLength(html,'utf8');
 const timestamps=[metadata?.requestedAt,metadata?.receivedAt];
 const chronologyValid=timestamps.every(v=>typeof v==='string'&&Number.isFinite(Date.parse(v)))&&
  Date.parse(timestamps[0])<=Date.parse(timestamps[1]);
 let sourceValid=false;
 try{
  const source=new URL(metadata.sourceUrl),final=new URL(metadata.finalUrl);
  sourceValid=metadata.status==='official_result_source_captured'&&metadata.verified===false&&
   metadata.officialResultVerified===false&&metadata.eligibleForCalibration===false&&
   metadata.finishByBoat===null&&metadata.httpStatus===200&&/^text\/html(?:;|$)/i.test(metadata.contentType||'')&&
   source.href===final.href&&source.origin==='https://www.boatrace.jp'&&source.pathname==='/owpc/pc/race/raceresult'&&
   ['rno','jcd','hd'].every(k=>source.searchParams.getAll(k).length===1)&&
   [...source.searchParams.keys()].every(k=>['rno','jcd','hd'].includes(k))&&
   source.searchParams.get('rno')===String(metadata.race)&&
   source.searchParams.get('jcd')===String(metadata.venue).padStart(2,'0')&&
   source.searchParams.get('hd')===String(metadata.date);
 }catch{}
 return {status:hashValid&&sizeValid&&chronologyValid&&sourceValid?'evidence_pair_valid':'evidence_pair_rejected',
  hashValid,sizeValid,chronologyValid,sourceValid,finishVerified:false,eligibleForCalibration:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [metadataFile,htmlFile]=process.argv.slice(2);
 if(!metadataFile||!htmlFile)throw Error('Usage: node scripts/verify-official-result-evidence-pair.mjs receipt.json source.html');
 const result=verifyOfficialResultEvidencePair(JSON.parse(fs.readFileSync(metadataFile,'utf8')),fs.readFileSync(htmlFile,'utf8'));
 console.log(JSON.stringify(result));
 if(result.status!=='evidence_pair_valid')process.exitCode=2;
}
