#!/usr/bin/env node
// Research-only official racelist capture; does not modify deployed Worker.
// Saves raw HTML hash, request time, and verified parsed racer features.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {officialRacelistUrl} from '../boat-score-2-official.js';
import {extractOfficialMetrics} from '../boat-score-2-metric-extractor.js';
import {parseOfficialBoatRows} from '../boat-score-2-boat-mapping.js';
import {buildResearchFeatureSnapshot} from '../boat-score-2-research-feature-snapshot.js';
import {classifyOfficialCaptureHtml} from './classify-official-capture-html.mjs';
const date=process.env.CAPTURE_DATE;
const venue=Number(process.env.CAPTURE_VENUE);
const race=Number(process.env.CAPTURE_RACE);
const target=officialRacelistUrl({date,venue,race});
if(target.status!=='ok')throw Error('invalid_selection');
const requestedAt=new Date().toISOString();
let result;
try {
 const response=await fetch(target.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
 const finalUrl=new URL(response.url||target.url);
 const officialHost=finalUrl.protocol==='https:'&&finalUrl.hostname==='www.boatrace.jp'&&finalUrl.pathname==='/owpc/pc/race/racelist';
 const body=await response.text();
 const receivedAt=new Date().toISOString();
 const digest=crypto.createHash('sha256').update(body).digest('hex');
 if(!response.ok||!officialHost||!/text\/html/i.test(response.headers.get('content-type')||'')||body.length>2_000_000)
  result={status:'invalid_official_response',httpStatus:response.status,receivedAt,officialHost};
 else {
  const page=classifyOfficialCaptureHtml(body);
  const noRaceText=page.explicitNoRaceNotice;
  const parsed=extractOfficialMetrics(body);
  const mapped=parseOfficialBoatRows(body);
  const diagnostic={parserReason:parsed.reason??null,metricsVerified:parsed.verified===true,metricStructure:parsed.diagnostics??null,
   boatMappingReason:mapped.reason??null,boatMappingVerified:mapped.verified===true,
   verifiedBoatCount:mapped.verified?mapped.racers?.length??0:0,
   tableCount:page.tableCount,explicitNoRaceNotice:noRaceText,
   hasNationalLabel:body.includes('全国'),hasLocalLabel:body.includes('当地'),
   hasMotorLabel:body.includes('モーター'),
   // Structural indicators only: never store personal page contents or infer metrics.
  };
  const snapshot=noRaceText?{status:'no_race_notice_detected',eligibleForCalibration:false,reason:'explicit_no_race_text_on_official_racelist'}:buildResearchFeatureSnapshot({date,venue,race,capturedAt:receivedAt,official:parsed.verified?parsed.racers:null});
  result={...snapshot,diagnostic,requestedAt,receivedAt,sourceUrl:target.url,responseSha256:digest,
   httpStatus:response.status,finalUrl:finalUrl.toString(),preRaceIndependentlyVerified:false};
 }
}catch(error){result={status:'fetch_failed',error:String(error?.message||error),requestedAt};}
fs.mkdirSync('prediction-captures',{recursive:true});
const file='prediction-captures/research-official-'+date+'-'+venue+'-'+race+'.json';
fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file,status:result.status,racers:result.racers?.length||0,diagnostic:result.diagnostic??null,eligibleForCalibration:false}));
// A green CI run must not be mistaken for a verified six-racer extraction.
// The workflow's artifact upload runs with if: always() even when this step fails.
if(result.status!=='captured_research_inputs')process.exitCode=2;
