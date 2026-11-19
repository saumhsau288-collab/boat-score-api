import assert from 'node:assert/strict';
import {compareExploratoryWinRateFinishes} from './compare-exploratory-winrates-results.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4100+i),averageWinRate:i===3?8:4}));
const resultRacers=racers.map((r,i)=>({boat:r.boat,racerId:r.racerId,finish:i===3?1:i<3?i+2:i===3?1:i+1}));
const report=compareExploratoryWinRateFinishes(
 {rows:[{date:'20261118',venue:2,race:2,statsVerified:true,racers}]},
 {rows:[{date:'20261118',venue:2,race:2,status:'parsed_needs_independent_review',racers:resultRacers}]}
);
assert.equal(report.matchedRaces,1);
assert.equal(report.highestWinRateRacerWon,1);
assert.equal(report.rows[0].highestAverageWinRateBoat,4);
assert.equal(report.eligibleForCalibration,0);
assert.deepEqual(report.winnerWinRateRankCounts,{'1':1,'2':0,'3':0,'4':0,'5':0,'6':0});
assert.equal(report.racesWithSixAverageST,0);
assert.deepEqual(report.topThreeOverlapDistribution,{'0':0,'1':0,'2':0,'3':0});
assert.equal(report.racesEligibleForCombinedRankDescription,0);
assert.equal(report.winnerWinRateAndSTTopThree,0);
assert.equal(report.racesWithWinnerAverageST,0);
assert.equal(report.rows[0].winnerAverageSTRank,null);
assert.equal(report.topWinRateActualInside.races,0);
assert.equal(report.topWinRateActualOutside.races,0);
const withCourses=compareExploratoryWinRateFinishes(
 {rows:[{date:'20261118',venue:2,race:2,statsVerified:true,racers:racers.map((r,i)=>({...r,averageST:0.11+i*0.01}))}]},
 {rows:[{date:'20261118',venue:2,race:2,status:'parsed_needs_independent_review',racers:resultRacers.map((r,i)=>({...r,actualEntryCourse:i===3?2:i===1?4:i+1}))}]}
);
assert.equal(withCourses.topWinRateActualInside.races,1);
assert.equal(withCourses.topWinRateInside.races,0);
assert.equal(withCourses.winnerActualCourseCounts['2'],1);
assert.deepEqual(withCourses.topThreeOverlapDistribution,{'0':0,'1':0,'2':1,'3':0});
assert.deepEqual(withCourses.rows[0].topThreeWinRateBoats,[4,1,2]);
assert.deepEqual(withCourses.rows[0].topThreeSTBoats,[1,2,3]);
assert.equal(withCourses.rows[0].topThreeOverlapCount,2);
assert.equal(withCourses.racesWithSixAverageST,1);
assert.equal(withCourses.rows[0].winnerAverageSTRank,4);
assert.equal(withCourses.winnerWinRateAndSTTopThree,0);
assert.equal(withCourses.winnerWinRateTopThreeInCompleteSTSample,1);
assert.equal(withCourses.winnerSTTopThreeInCompleteSTSample,0);
assert.equal(withCourses.winnerEitherWinRateOrSTTopThree,1);
assert.equal(withCourses.racesEligibleForCombinedRankDescription,1);
assert.equal(withCourses.winnerActualCourseCounts['2'],1);
assert.equal(withCourses.eligibleForCalibration,0);
assert.equal(compareExploratoryWinRateFinishes({rows:[{date:'20261118',venue:2,race:2,statsVerified:true,racers}]},
 {rows:[{date:'20261119',venue:2,race:2,status:'parsed_needs_independent_review',racers:resultRacers}]}).matchedRaces,0);
assert.equal(compareExploratoryWinRateFinishes({rows:[{date:'20261118',venue:2,race:2,statsVerified:true,racers}]},
 {rows:[{date:'20261118',venue:2,race:2,status:'parsed_needs_independent_review',racers:resultRacers.map((r,i)=>i===0?{...r,racerId:'9999'}:r)}]}).matchedRaces,0);
console.log('Exploratory win-rate finish matching checks passed (synthetic only)');
