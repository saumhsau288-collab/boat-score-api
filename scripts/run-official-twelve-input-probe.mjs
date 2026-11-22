#!/usr/bin/env node
// Single live official racelist probe, read-only, research only.
// Use an explicit YYYYMMDD venue race. A fetched page is not a validated
// pre-race forecast or evidence of actual race scheduling.
import {probeOfficialTwelveInputs} from './probe-official-twelve-inputs.mjs';
import {writeFile} from 'node:fs/promises';
const [date,venue,race,output]=process.argv.slice(2);
if(!/^20\d{6}$/.test(date||'')||!Number.isInteger(Number(venue))||!Number.isInteger(Number(race))||!output){
 console.error('Usage: node scripts/run-official-twelve-input-probe.mjs YYYYMMDD venue race output.json');
 process.exitCode=2;
}else{
 const result=await probeOfficialTwelveInputs({date,venue:Number(venue),race:Number(race)});
 await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:result.status,reason:result.reason||null,
  sourceUrl:result.sourceUrl||null,numberOfRacers:result.racers?.length??0,
  independentlyAuthenticatedBeforeRace:result.independentlyAuthenticatedBeforeRace===true,
  readyMethods:result.readiness?.ready??[],
  missingFields:result.racers?.length===6?Object.fromEntries(['entryCourse','averageStartTiming','exhibitionTime','last50CoursePodiumRate'].map(key=>[key,result.racers.filter(r=>r[key]===null||r[key]===undefined).length])):null,
  abstainedMethods:result.readiness?.abstained??[],
  readinessInvalid:result.readiness?.invalid??null}));
}
