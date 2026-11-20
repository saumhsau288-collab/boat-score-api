import assert from 'node:assert/strict';
import {reportResearchSnapshotReadiness as report} from './report-research-snapshot-readiness.mjs';
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4001+i),name:'R'+i,sourceVerified:true,
 nationalWinRate:6.1,localWinRate:5.4,motorTwoWinRate:40,
 recent50Verified:false,entryCourseVerified:false
}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',
 date:'20261120',venue:18,race:1,racers,preRaceIndependentlyVerified:false};
const first=report(snapshot);
assert.equal(first.status,'official_six_ready');
assert.equal(first.officialRacerCount,6);
assert.deepEqual(first.boats,[1,2,3,4,5,6]);
assert.equal(first.readyForResearchMorningScoring,false);
assert.equal(first.readyForResearchPrestartScoring,false);
assert(first.missingPrestart.includes('six_verified_start_timing_and_exhibition'));
assert(first.missingPrestart.includes('verified_weather'));
assert.equal(first.eligibleForCalibration,false);
assert(first.missing.includes('six_independently_verified_recent50_records'));
assert(first.missing.includes('independent_pre_race_authentication'));
assert.equal(report({...snapshot,racers:racers.slice(1)}).status,'official_six_not_ready');
assert.equal(report({...snapshot,racers:racers.map(r=>({...r,sourceVerified:false}))}).officialRacerCount,0);
const complete=report({...snapshot,racers:racers.map(r=>({...r,recent50Verified:true,entryCourseVerified:true}))});
assert.equal(complete.readyForResearchMorningScoring,false);
const verifiedRecent50Records=racers.map(r=>({racerId:r.racerId,winRate:50,verified:true,sourceVerified:true}));
const fullySourced=report({...snapshot,verifiedRecent50Records});
assert.equal(fullySourced.readyForResearchMorningScoring,false);
assert(fullySourced.missing.includes('independent_pre_race_authentication'));
assert.equal(report({...snapshot,verifiedRecent50Records,preRaceIndependentlyVerified:true}).readyForResearchMorningScoring,true);
assert.equal(fullySourced.readyForResearchPrestartScoring,false);
const prestartRacers=racers.map((r,i)=>({...r,entryCourse:i+1,entryCourseVerified:true,
 startTiming:0.12,startTimingVerified:true,exhibitionTime:6.8,exhibitionTimeVerified:true}));
const prestart={...snapshot,racers:prestartRacers,verifiedRecent50Records,
 weather:{verified:true,sourceVerified:true,windSpeed:2,windDirection:'北',waveHeight:1},preRaceIndependentlyVerified:true};
assert.equal(report(prestart).readyForResearchPrestartScoring,true);
const duplicateIdRacers=prestartRacers.map((r,i)=>i===5?{...r,racerId:prestartRacers[0].racerId}:r);
const duplicateIdReport=report({...prestart,racers:duplicateIdRacers});
assert.equal(duplicateIdReport.readyForResearchMorningScoring,false);
assert.equal(duplicateIdReport.readyForResearchPrestartScoring,false);
assert(duplicateIdReport.missing.includes('six_unique_racer_registration_ids'));
assert.deepEqual(report(prestart).missingPrestart,[]);
assert.equal(report({...prestart,preRaceIndependentlyVerified:false}).readyForResearchPrestartScoring,false);
assert.equal(report({...prestart,weather:null}).readyForResearchPrestartScoring,false);
assert.equal(report({...prestart,weather:{...prestart.weather,windDirection:null}}).readyForResearchPrestartScoring,false);
assert.equal(report({...prestart,weather:{...prestart.weather,waveHeight:null}}).readyForResearchPrestartScoring,false);
assert.equal(report({...prestart,racers:prestartRacers.map((r,i)=>i===1?{...r,entryCourse:1}:r)}).readyForResearchPrestartScoring,false);
assert.equal(report({...prestart,racers:prestartRacers.map((r,i)=>i===0?{...r,startTimingVerified:false}:r)}).readyForResearchPrestartScoring,false);
assert.equal(report({...snapshot,verifiedRecent50Records:verifiedRecent50Records.map(r=>({...r,sourceVerified:false}))}).readyForResearchMorningScoring,false);
assert.equal(report({...snapshot,verifiedRecent50Records:[...verifiedRecent50Records.slice(0,5),verifiedRecent50Records[0]]}).readyForResearchMorningScoring,false);
assert.equal(complete.eligibleForCalibration,false);
console.log('Research snapshot readiness tests passed');
