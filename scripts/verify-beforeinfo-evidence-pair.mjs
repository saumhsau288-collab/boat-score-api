#!/usr/bin/env node
// Reject HTML whose bytes do not match the saved official source receipt.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export function verifyBeforeinfoEvidencePair(metadata,html){
 const actual=createHash('sha256').update(html).digest('hex');
 const hashValid=typeof metadata?.responseSha256==='string'&&/^[a-f0-9]{64}$/.test(metadata.responseSha256)&&metadata.responseSha256===actual;
 const sizeValid=metadata?.bodyBytes===Buffer.byteLength(html,'utf8');
 const sourceValid=metadata?.status==='beforeinfo_source_captured'&&metadata?.verified===false&&
  metadata?.preRaceIndependentlyVerified===false&&metadata?.eligibleForCalibration===false&&
  typeof metadata?.sourceUrl==='string'&&typeof metadata?.finalUrl==='string'&&
  metadata.sourceUrl===metadata.finalUrl&&
  (()=>{try{const url=new URL(metadata.sourceUrl);return url.origin==='https://www.boatrace.jp'&&
   url.pathname==='/owpc/pc/race/beforeinfo'&&
   ['rno','jcd','hd'].every(k=>url.searchParams.getAll(k).length===1)&&
   [...url.searchParams.keys()].every(k=>['rno','jcd','hd'].includes(k))&&
   url.searchParams.get('rno')===String(metadata.race)&&
   url.searchParams.get('jcd')===String(metadata.venue).padStart(2,'0')&&
   url.searchParams.get('hd')===String(metadata.date)&&
   metadata.httpStatus===200&&/^text\/html(?:;|$)/i.test(metadata.contentType||'');}catch{return false;}})();
 return {status:hashValid&&sizeValid&&sourceValid?'evidence_pair_valid':'evidence_pair_rejected',
  hashValid,sizeValid,sourceValid,verified:false,eligibleForCalibration:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [metadataFile,htmlFile]=process.argv.slice(2);
 if(!metadataFile||!htmlFile)throw Error('Usage: node scripts/verify-beforeinfo-evidence-pair.mjs receipt.json source.html');
 const result=verifyBeforeinfoEvidencePair(JSON.parse(fs.readFileSync(metadataFile,'utf8')),fs.readFileSync(htmlFile,'utf8'));
 console.log(JSON.stringify(result));
 if(result.status!=='evidence_pair_valid')process.exitCode=2;
}
