#!/usr/bin/env node
// Research-only structural diagnostics. Do not treat text matches as verified boat data.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export function diagnoseOfficialBeforeinfoHtml(html){
 if(typeof html!=='string'||html.length===0) return {status:'empty_html',verified:false};
 const labels=['展示タイム','スタート展示','進入','チルト','風向','風速','波高','ST'];
 const count=pattern=>(html.match(pattern)||[]).length;
 const labelPresence=Object.fromEntries(labels.map(label=>[label,html.includes(label)]));
 const result={
  status:'structure_diagnostic_only',
  htmlBytes:Buffer.byteLength(html,'utf8'),
  htmlSha256:createHash('sha256').update(html).digest('hex'),
  tableCount:count(/<table\\b/gi),
  rowCount:count(/<tr\\b/gi),
  cellCount:count(/<(?:td|th)\\b/gi),
  labelPresence,
  verified:false,preRaceIndependentlyVerified:false,eligibleForCalibration:false,
  racers:[],weather:null,
  warning:'Text matches and table counts are not sufficient to assign values to racers or entry courses.'
 };
 return result;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];
 if(!file||!file.endsWith('.html'))throw Error('Usage: node scripts/diagnose-official-beforeinfo-html.mjs saved.html');
 console.log(JSON.stringify(diagnoseOfficialBeforeinfoHtml(fs.readFileSync(file,'utf8')),null,2));
}
