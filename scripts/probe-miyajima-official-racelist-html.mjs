#!/usr/bin/env node
// Bounded research-only snapshot of one historical official racelist page.
// Saves raw bytes, provenance and diagnostic extraction; never authenticates deadlines.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {extractCutoffFromHtmlScheduleTable} from './extract-cutoff-from-html-schedule-table.mjs';
const expected={date:'20261120',venue:'17',race:2};
const url='https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261120&jcd=17&rno=2';
const requestedAt=new Date().toISOString();
const res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'BoatScoreResearchEvidence/1.0'}});
if(res.status!==200||res.redirected||res.url!==url||!/text\/html/i.test(res.headers.get('content-type')??''))throw Error('official_source_response_not_eligible');
const bytes=Buffer.from(await res.arrayBuffer());
if(bytes.length>2_000_000)throw Error('html_too_large');
const html=bytes.toString('utf8');
const output='research-output/miyajima-2r-racelist';
await fs.mkdir('research-output',{recursive:true});
await fs.writeFile(output+'.html',bytes);
const parsedForDiagnostics=extractCutoffFromHtmlScheduleTable({html,expectedRace:2,sourceVerified:true});
const report={expected,url,requestedAt,receivedAt:new Date().toISOString(),status:res.status,finalUrl:res.url,contentType:res.headers.get('content-type'),byteLength:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),scheduleDiagnostic:extractCutoffFromHtmlScheduleTable({html,expectedRace:2,sourceVerified:false}),unverifiedParsedSchedule:{candidateCutoffJst:parsedForDiagnostics.cutoffJst,parseReason:parsedForDiagnostics.reason,parsedTableMatched:parsedForDiagnostics.reason===null,verified:false},unverifiedParsedScheduleIsAuthenticated:false,independentlyAuthenticated:false,eligibleForCalibration:false};
await fs.writeFile(output+'.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
