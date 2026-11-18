#!/usr/bin/env node
// Research-only capture diagnostics. Never infer authentic pre-race performance.
import fs from 'node:fs';
import path from 'node:path';

export function summarizeCapture(data) {
  if (!Array.isArray(data?.records)) throw new Error('Capture records missing');
  const counts={attempted:data.records.length,networkTimeout:0,otherNetworkError:0,httpFailure:0,notReady:0,ready:0,readyWithMissingInputs:0,readyWithNoReportedMissingInputs:0,retried:0,recoveredAfterRetry:0};
  const byVenue={};
  const byRace={};
  const morningByRace={};
  const uniquePairs=new Set();
  let duplicateVenueRacePairs=0,invalidVenueRacePairs=0;
  const timing={firstRequestedAt:null,lastRequestedAt:null,lastReceivedAt:null,elapsedSeconds:null,byVenue:{}};
  const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
  const minTime=(a,b)=>a===null?b:b===null?a:Math.min(a,b);
  const maxTime=(a,b)=>a===null?b:b===null?a:Math.max(a,b);
  let firstRequest=null,lastRequest=null,lastResponse=null;
  let requestWithinMorningWindow=0,requestOutsideMorningWindow=0,requestTimeUnknown=0;
  let responseWithinMorningWindow=0,responseOutsideMorningWindow=0,responseTimeUnknown=0;
  let readyResponseWithinMorningWindow=0,readyResponseOutsideMorningWindow=0,readyResponseTimeUnknown=0;
  let usablePicksWithinMorningWindow=0,usablePicksOutsideMorningWindow=0,usablePicksTimeUnknown=0;
  let validSixPlusSix=0,overlappingMainUpsetTickets=0,fullyDistinctTwelveTickets=0;
  const validPick=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(p).size===3;
  const validSix=p=>Array.isArray(p)&&p.length===6&&p.every(validPick)&&new Set(p.map(x=>x.join('-'))).size===6;
  const morningStart=typeof data.date==='string'&&/^20\d{6}$/.test(data.date)?Date.parse(data.date.slice(0,4)+'-'+data.date.slice(4,6)+'-'+data.date.slice(6,8)+'T07:45:00+09:00'):NaN;
  const morningEnd=Number.isFinite(morningStart)?morningStart+45*60*1000:NaN;
  const milestoneClock=['08:05','08:15','08:30'];
  const eightClockMilestones=Object.fromEntries(milestoneClock.map(clock=>[clock,{responses:0,ready:0,validSixPlusSix:0,distinctTwelve:0}]));
  const afterEight=Number.isFinite(morningStart)?morningStart+15*60*1000:NaN;
  const milestoneTimes=milestoneClock.map(clock=>Number.isFinite(afterEight)?afterEight+
    (Number(clock.slice(0,2))*60+Number(clock.slice(3))-(8*60))*60000:NaN);

  const durations={ready:[],notReady:[],networkTimeout:[],otherFailure:[]};
  const attemptStats={firstAttempts:0,secondAttempts:0,firstAttemptTimeouts:0,secondAttemptTimeouts:0,firstAttemptHttpSuccess:0,secondAttemptHttpSuccess:0,firstAttemptOtherErrors:0,secondAttemptOtherErrors:0};
  const responseHashPairs=new Map();
  let recordsWithResponseHash=0,invalidResponseHashes=0;
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
    const morningRace=morningByRace[raceKey]??={requestedInWindow:0,respondedInWindow:0,readyInWindow:0,usableSixPlusSixInWindow:0};
    if(venueKey==='unknown'||raceKey==='unknown') invalidVenueRacePairs++;
    else {
      const pair=venueKey+':'+raceKey;
      if(uniquePairs.has(pair)) duplicateVenueRacePairs++;
      uniquePairs.add(pair);
    }
    if(record.httpStatus===200&&record.responseSha256!==undefined){
      if(typeof record.responseSha256!=='string'||!/^[a-f0-9]{64}$/i.test(record.responseSha256))invalidResponseHashes++;
      else {
        recordsWithResponseHash++;
        const key=record.responseSha256.toLowerCase();
        const entry=responseHashPairs.get(key)??{count:0,pairs:new Set()};
        entry.count++;
        if(venueKey!=='unknown'&&raceKey!=='unknown')entry.pairs.add(venueKey+':'+raceKey);
        responseHashPairs.set(key,entry);
      }
    }
    const start=validTime(record.requestedAt),end=validTime(record.receivedAt);
    const elapsed=start!==null&&end!==null&&end>=start?(end-start)/1000:null;
    const milestones=end===null||!Number.isFinite(afterEight)?[]:milestoneClock.filter((clock,i)=>end>=afterEight&&end<=milestoneTimes[i]);
    for(const clock of milestones)eightClockMilestones[clock].responses++;

    const bucket=record.error?(/timeout|timed out/i.test(record.error)?'networkTimeout':'otherFailure'):
      record.httpStatus===200?(record.response?.ready===true?'ready':'notReady'):'otherFailure';
    if(elapsed!==null)durations[bucket].push(elapsed);
    if(start!==null&&Number.isFinite(morningStart)&&start>=morningStart&&start<=morningEnd)morningRace.requestedInWindow++;
    if(end!==null&&Number.isFinite(morningStart)&&end>=morningStart&&end<=morningEnd)morningRace.respondedInWindow++;
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
    if(Array.isArray(record.attempts)) for(const attempt of record.attempts) {
      if(attempt?.attempt!==1&&attempt?.attempt!==2)continue;
      const prefix=attempt.attempt===1?'first':'second';
      attemptStats[prefix+'Attempts']++;
      if(attempt.httpStatus===200)attemptStats[prefix+'AttemptHttpSuccess']++;
      else if(typeof attempt.error==='string'&&/timeout|timed out/i.test(attempt.error))attemptStats[prefix+'AttemptTimeouts']++;
      else if(attempt.error)attemptStats[prefix+'AttemptOtherErrors']++;
    }
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
      for(const clock of milestones)eightClockMilestones[clock].ready++;
      if(end!==null&&Number.isFinite(morningStart)&&end>=morningStart&&end<=morningEnd)morningRace.readyInWindow++;
      if(end===null||!Number.isFinite(morningStart))readyResponseTimeUnknown++;
      else if(end>=morningStart&&end<=morningEnd)readyResponseWithinMorningWindow++;
      else readyResponseOutsideMorningWindow++;
      if(validSix(record.response.main)&&validSix(record.response.upset)) {
        validSixPlusSix++;
        for(const clock of milestones)eightClockMilestones[clock].validSixPlusSix++;
        if(end!==null&&Number.isFinite(morningStart)&&end>=morningStart&&end<=morningEnd)morningRace.usableSixPlusSixInWindow++;
        const mainKeys=new Set(record.response.main.map(p=>p.join('-')));
        if(record.response.upset.some(p=>mainKeys.has(p.join('-'))))overlappingMainUpsetTickets++;
        else {fullyDistinctTwelveTickets++;for(const clock of milestones)eightClockMilestones[clock].distinctTwelve++;}
        if(end===null||!Number.isFinite(morningStart))usablePicksTimeUnknown++;
        else if(end>=morningStart&&end<=morningEnd)usablePicksWithinMorningWindow++;
        else usablePicksOutsideMorningWindow++;
      }
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
  timing.morningWindow={startJst:'07:45',endJst:'08:30',requestWithinMorningWindow,requestOutsideMorningWindow,requestTimeUnknown,responseWithinMorningWindow,responseOutsideMorningWindow,responseTimeUnknown,readyResponseWithinMorningWindow,readyResponseOutsideMorningWindow,readyResponseTimeUnknown,usablePicksWithinMorningWindow,usablePicksOutsideMorningWindow,usablePicksTimeUnknown};
  const validVenues=Array.isArray(data.requestedVenues)&&data.requestedVenues.length>0&&
    data.requestedVenues.every(v=>Number.isInteger(v)&&v>=1&&v<=24)&&
    new Set(data.requestedVenues).size===data.requestedVenues.length;
  const validRaces=Number.isInteger(data.requestedMaxRaces)&&data.requestedMaxRaces>=1&&data.requestedMaxRaces<=12;
  const scopeKnown=validVenues&&validRaces;
  const expectedPairs=scopeKnown?data.requestedVenues.flatMap(venue=>
    Array.from({length:data.requestedMaxRaces},(_,i)=>venue+':'+(i+1))):null;
  const coverage={uniqueVenueRacePairs:uniquePairs.size,duplicateVenueRacePairs,invalidVenueRacePairs,
    requestedVenueCount:scopeKnown?data.requestedVenues.length:null,
    expectedPairCount:expectedPairs?.length??null,
    missingPairsWithinRequestedVenues:expectedPairs?.filter(pair=>!uniquePairs.has(pair))??null,
    unexpectedPairsOutsideScope:scopeKnown?[...uniquePairs].filter(pair=>!expectedPairs.includes(pair)):null,
    warning:scopeKnown?'Coverage uses explicitly requested venues and race scope, not verified active racing venues.':'Capture scope unavailable; cannot assert missing records.'};
  const reusedResponseHashes=[...responseHashPairs.entries()]
    .filter(([,entry])=>entry.pairs.size>1)
    .map(([sha256,entry])=>({sha256,records:entry.count,distinctVenueRacePairs:entry.pairs.size}))
    .sort((a,b)=>b.distinctVenueRacePairs-a.distinctVenueRacePairs||a.sha256.localeCompare(b.sha256));
  const responseHashDiagnostics={recordsWithResponseHash,invalidResponseHashes,
    uniqueResponseHashes:responseHashPairs.size,
    repeatedAcrossDifferentRaces:reusedResponseHashes.length,
    affectedDistinctVenueRacePairs:new Set([...responseHashPairs.values()]
      .filter(entry=>entry.pairs.size>1).flatMap(entry=>[...entry.pairs])).size,
    topRepeatedHashes:reusedResponseHashes.slice(0,5),
    warning:'Identical raw API response bodies across races warrant investigation but may be legitimate; hashes alone do not establish a predictor defect.'};
  const rankedBlockers=[
    {code:'networkTimeout',races:counts.networkTimeout,action:'Investigate predictor latency and retry recoveries'},
    {code:'officialSixBoatUnverified',races:notReadyReasons.official_six_boat_stats_unverified||0,action:'Verify six-boat official input source; do not synthesize missing values'},
    {code:'otherNotReady',races:counts.notReady-(notReadyReasons.official_six_boat_stats_unverified||0),action:'Inspect API not-ready reasons'},
    {code:'httpFailure',races:counts.httpFailure,action:'Inspect non-200 responses'},
    {code:'otherNetworkError',races:counts.otherNetworkError,action:'Inspect connection and transport errors'}
  ].sort((a,b)=>b.races-a.races||a.code.localeCompare(b.code));
  const topBlocker=rankedBlockers.find(b=>b.races>0)||null;
  const latencySeconds=Object.fromEntries(Object.entries(durations).map(([key,values])=>{
    values.sort((a,b)=>a-b);
    const percentile=p=>values.length?Math.round(values[Math.ceil(values.length*p)-1]*10)/10:null;
    return [key,{samples:values.length,p50:percentile(.5),p95:percentile(.95),max:values.length?Math.round(values.at(-1)*10)/10:null}];
  }));
  return {date:data.date||null,captureTimeJst:data.captureTimeJst||null,scheduledMorningWindow:data.scheduledMorningWindow===true,
    counts,byVenue,byRace,morningByRace,eightClockMilestones,responseHashDiagnostics,timing,coverage,latencySeconds,attemptStats,rankedBlockers,topBlocker,ticketDistinctness:{validSixPlusSix,overlappingMainUpsetTickets,fullyDistinctTwelveTickets},missingInputLabels,notReadyReasons,
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
