import assert from 'node:assert/strict';
import {summarizeCapture} from './audit-morning-capture-outcomes.mjs';
const x=summarizeCapture({date:'20261118',captureTimeJst:'17:42',requestedVenues:[1],requestedMaxRaces:12,records:[
 {venue:1,race:1,requestedAt:'2026-11-17T23:00:00Z',receivedAt:'2026-11-17T23:00:20Z',error:'The operation was aborted due to timeout'},
 {error:'connection reset'},
 {httpStatus:503},
 {httpStatus:200,response:{ready:false,reason:'official_six_boat_stats_unverified'}},
 {venue:1,race:12,requestedAt:'2026-11-17T23:01:00Z',receivedAt:'2026-11-17T23:01:15Z',httpStatus:200,attempts:[{attempt:1,error:'timeout'},{attempt:2,httpStatus:200}],response:{ready:true,missingInputs:['last50','weather','weather']}},
 {httpStatus:200,response:{ready:true,missingInputs:[]}},
 {httpStatus:200,response:{ready:true}}
]});
assert.deepEqual(x.counts,{attempted:7,networkTimeout:1,otherNetworkError:1,httpFailure:1,notReady:1,ready:3,readyWithMissingInputs:1,readyWithNoReportedMissingInputs:1,retried:1,recoveredAfterRetry:1});
assert.deepEqual(x.byVenue['1'],{attempted:2,networkTimeout:1,otherNetworkError:0,httpFailure:0,notReady:0,ready:1});
assert.equal(x.byVenue.unknown.attempted,5);
assert.equal(x.byRace['1'].networkTimeout,1);
assert.equal(x.byRace['12'].ready,1);
assert.equal(x.byRace['12'].firstRequestedAt,'2026-11-17T23:01:00.000Z');
assert.equal(x.byRace.unknown.attempted,5);
assert.equal(x.coverage.uniqueVenueRacePairs,2);
assert.equal(x.coverage.duplicateVenueRacePairs,0);
assert.equal(x.coverage.invalidVenueRacePairs,5);
assert.equal(x.coverage.expectedPairCount,12);
assert.equal(x.coverage.missingPairsWithinRequestedVenues.length,10);
const repeated=summarizeCapture({records:[{venue:1,race:1},{venue:1,race:1}]});
assert.equal(repeated.coverage.duplicateVenueRacePairs,1);
assert.equal(repeated.coverage.uniqueVenueRacePairs,1);
assert.equal(repeated.coverage.missingPairsWithinRequestedVenues,null);
const partial=summarizeCapture({requestedVenues:[3,8],requestedMaxRaces:2,records:[{venue:3,race:1},{venue:8,race:1},{venue:3,race:2}]});
assert.equal(partial.coverage.expectedPairCount,4);
assert.deepEqual(partial.coverage.missingPairsWithinRequestedVenues,['8:2']);
assert.equal(x.timing.elapsedSeconds,75);
assert.deepEqual(x.timing.morningWindow,{startJst:'07:45',endJst:'08:30',requestWithinMorningWindow:2,requestOutsideMorningWindow:0,requestTimeUnknown:5,responseWithinMorningWindow:2,responseOutsideMorningWindow:0,responseTimeUnknown:5,readyResponseWithinMorningWindow:1,readyResponseOutsideMorningWindow:0,readyResponseTimeUnknown:2,usablePicksWithinMorningWindow:0,usablePicksOutsideMorningWindow:0,usablePicksTimeUnknown:0});
const validSix=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const usable=summarizeCapture({date:'20261118',records:[{venue:1,race:1,receivedAt:'2026-11-17T23:00:10Z',httpStatus:200,response:{ready:true,main:validSix,upset:validSix}},{venue:1,race:2,receivedAt:'2026-11-18T00:00:00Z',httpStatus:200,response:{ready:true,main:validSix,upset:validSix.slice(0,5)}}]});
assert.equal(usable.timing.morningWindow.usablePicksWithinMorningWindow,1);
assert.equal(usable.timing.morningWindow.usablePicksOutsideMorningWindow,0);
assert.equal(x.timing.morningWindow.readyResponseWithinMorningWindow+x.timing.morningWindow.readyResponseOutsideMorningWindow+x.timing.morningWindow.readyResponseTimeUnknown,x.counts.ready);
assert.equal(x.timing.firstRequestedAt,'2026-11-17T23:00:00.000Z');
assert.equal(x.timing.byVenue['1'].elapsedSeconds,75);
assert.equal(x.timing.byVenue.unknown.elapsedSeconds,null);
assert.deepEqual(x.missingInputLabels,{last50:1,weather:1});
assert.equal(x.notReadyReasons.official_six_boat_stats_unverified,1);
assert.equal(x.authenticatedBeforeRace,false);
assert.equal(x.accuracyCalculationPermitted,false);
console.log('Morning capture diagnostics passed');
