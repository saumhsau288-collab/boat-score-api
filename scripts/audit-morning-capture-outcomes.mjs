#!/usr/bin/env node
// Research-only capture diagnostics. Never infer authentic pre-race performance.
import fs from 'node:fs';
import path from 'node:path';

export function summarizeCapture(data) {
  if (!Array.isArray(data?.records)) throw new Error('Capture records missing');
  const counts={attempted:data.records.length,networkTimeout:0,otherNetworkError:0,httpFailure:0,notReady:0,ready:0,readyWithMissingInputs:0,readyWithNoReportedMissingInputs:0,retried:0,recoveredAfterRetry:0};
  const byVenue={};
  const byRace={};
  const timing={firstRequestedAt:null,lastRequestedAt:null,lastReceivedAt:null,elapsedSeconds:null,byVenue:{}};
  const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
  const minTime=(a,b)=>a===null?b:b===null?a:Math.min(a,b);
  const maxTime=(a,b)=>a===null?b:b===null?a:Math.max(a,b);
  let firstRequest=null,lastRequest=null,lastResponse=null;
  let requestWithinMorningWindow=0,requestOutsideMorningWindow=0,requestTimeUnknown=0;
  const morningStart=typeof data.date==='string'&&/^20\d{6}$/.test(data.date)?Date.parse(data.date.slice(0,4)+'-'+data.date.slice(4,6)+'-'+data.date.slice(6,8)+'T07:45:00+09:00'):NaN;
  const morningEnd=Number.isFinite(morningStart)?morningStart+45*60*1000:NaN;
  const missingInputLabels={};
  const notReadyReasons={};
  for(const record of data.records) {
    const venue=Number(record.venue);
    const venueKey=Number.isInteger(venue)&&venue>=1&&venue<=24?String(venue):'unknown';
    const group=byVenue[venueKey]??={attempted:0,networkTimeout:0,otherNetworkError:0,httpFailure:0,notReady:0,ready:0};
    group.attempted++;
    const race=Number(record.race);
    const raceKey=Number.isInteger(race)&&race>=1&&race<=12?String(race):'unknown';
    const raceGroup=byRace[raceKey]??={attempted:0,ready:0,networkTimeout:0,firstRequestedAt:null,lastRequestedAt:null};
    raceGroup.attempted++;
    const start=validTime(record.requestedAt),end=validTime(record.receivedAt);
    if(start===null||!Number.isFinite(morningStart))requestTimeUnknown++;
    else if(start>=morningStart&&start<=morningEnd)requestWithinMorningWindow++;
    else requestOutsideMorningWindow++;
    if(end===null||!Number.isFinite(morningStart))responseTimeUnknown++;
    else if(end>=morningStart&&end<=morningEnd)responseWithinMorningWindow++;
    else responseOutsideMorningWindow++;
    const raceFirst=minTime(validTime(raceGroup.firstRequestedAt),start);
    const raceLast=maxTime(validTime(raceGroup.lastRequestedAt),start);
    raceGroup.firstRequestedAt=raceFirst===null?null:new Date(raceFirst).toISOString();
    raceGroup.lastRequestedAt=raceLast===null?null:new Date(raceLast).toISOString();
    firstRequest=minTime(firstRequest,start);
    lastRequest=maxTime(lastRequest,start);
    lastResponse=maxTime(lastResponse,end);
    const vTiming=timing.byVenue[venueKey]??={firstRequestedAt:null,lastReceivedAt:null,elapsedSeconds:null};
    const vFirst=minTime(validTime(vTiming.firstRequestedAt),start);
    const vLast=maxTime(validTime(vTiming.lastReceivedAt),end);
    vTiming.firstRequestedAt=vFirst===null?null:new Date(vFirst).toISOString();
    vTiming.lastReceivedAt=vLast===null?null:new Date(vLast).toISOString();
    vTiming.elapsedSeconds=vFirst!==null&&vLast!==null&&vLast>=vFirst?Math.round((vLast-vFirst)/1000):null;
    if(Array.isArray(record.attempts)&&record.attempts.length>1) {
      counts.retried++;
      if(record.httpStatus===200) counts.recoveredAfterRetry++;
    }
    if(record.error) {
      if(/timeout|timed out/i.test(record.error)) {counts.networkTimeout++;group.networkTimeout++;raceGroup.networkTimeout++;}
      else {counts.otherNetworkError++;group.otherNetworkError++;}
    } else if(record.httpStatus!==200) {
      counts.httpFailure++;group.httpFailure++;
    } else if(record.response?.ready===true) {
      counts.ready++;group.ready++;raceGroup.ready++;
      if(Array.isArray(record.response.missingInputs)) {
        if(record.response.missingInputs.length) counts.readyWithMissingInputs++;
        else counts.readyWithNoReportedMissingInputs++;
        for(const label of new Set(record.response.missingInputs)) {
          const key=String(label);
          missingInputLabels[key]=(missingInputLabels[key]||0)+1;
        }
      }
    } else {
      counts.notReady++;group.notReady++;
      const reason=String(record.response?.reason||'not_reported');
      notReadyReasons[reason]=(notReadyReasons[reason]||0)+1;
    }
  }
  timing.firstRequestedAt=firstRequest===null?null:new Date(firstRequest).toISOString();
  timing.lastRequestedAt=lastRequest===null?null:new Date(lastRequest).toISOString();
  timing.lastReceivedAt=lastResponse===null?null:new Date(lastResponse).toISOString();
  timing.elapsedSeconds=firstRequest!==null&&lastResponse!==null&&lastResponse>=firstRequest?Math.round((lastResponse-firstRequest)/1000):null;
  timing.morningWindow={startJst:'07:45',endJst:'08:30',requestWithinMorningWindow,requestOutsideMorningWindow,requestTimeUnknown,responseWithinMorningWindow,responseOutsideMorningWindow,responseTimeUnknown};
  return {date:data.date||null,captureTimeJst:data.captureTimeJst||null,scheduledMorningWindow:data.scheduledMorningWindow===true,
    counts,byVenue,byRace,timing,missingInputLabels,notReadyReasons,
    authenticatedBeforeRace:false,accuracyCalculationPermitted:false,
    warning:'Read-only capture outcomes are not prediction accuracy or verified pre-race evidence. Missing labels are self-reported and do not prove every input was used.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)) {
  const source=process.argv[2];
  if(!source) throw new Error('Pass a raw capture JSON path');
  const result=summarizeCapture(JSON.parse(fs.readFileSync(source,'utf8')));
  const target=source.replace(/\.json$/,'-diagnostics.json');
  fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({target,...result},null,2));
}
