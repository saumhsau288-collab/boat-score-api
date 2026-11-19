import assert from 'node:assert/strict';
import {compareHistoricalRace,compareHistoricalSet,compareChronologicalHoldout} from './boat-score-2-historical-comparison.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:6,localWinRate:6,
 motorTwoWinRate:50,recent50WinRate:20,exhibitionScore:50,
 averageStartTiming:0.15,entryCourse:i+1}));
const row={date:'20261118',venue:1,race:1,preRaceSnapshot:true,resultVerified:true,
 racers,finishOrder:[1,2,3,4,5,6],entryCourseSource:'verified_pre_race',averageStartTimingSource:'historical_pre_race',preRaceSourceVerified:true,officialResultSourceVerified:true,preRaceSourceUrl:'https://example.org/pre',officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult',preRaceCapturedAt:'2026-11-18T09:00:00+09:00',officialCutoffAt:'2026-11-18T10:00:00+09:00'};
assert.equal(compareHistoricalRace(row).status,'compared');
assert.equal(compareHistoricalSet([row]).eligible,1);
assert.equal(compareHistoricalSet([row,row]).status,'duplicate_races');
assert.equal(compareHistoricalSet([{...row,preRaceSnapshot:false}]).eligible,0);
assert.equal(compareHistoricalSet([{...row,racers:racers.map(r=>({...r,averageStartTiming:null}))}]).eligible,0);
console.log('Historical comparison structural tests passed (synthetic data only)');

assert.equal(compareHistoricalRace({...row,preRaceCapturedAt:'2026-11-18T11:00:00+09:00'}).reason,'unverified_provenance_or_cutoff');
assert.equal(compareHistoricalRace({...row,preRaceSourceVerified:false}).status,'excluded');

const report=compareHistoricalSet([row,{...row,race:2,preRaceSourceVerified:false},{...row,race:3,preRaceSnapshot:false}]);
assert.equal(report.eligible,1);
assert.equal(report.excluded,2);
assert.equal(report.excludedReasons.unverified_provenance_or_cutoff,1);
assert.equal(report.excludedReasons.unverified_or_invalid_race,1);

assert.equal(compareHistoricalRace(row).experimental.winnerRank,1);
assert.equal(compareHistoricalRace(row).experimental.winnerTopThree,true);
assert.equal(compareHistoricalSet([row]).experimental.winnerTopThreeHits,1);
assert.equal(compareHistoricalSet([row]).experimental.winnerRankSum,1);

assert.equal(compareHistoricalRace({...row,entryCourseSource:'boat_number_proxy'}).reason,'unverified_course_or_start_source');
assert.equal(compareHistoricalRace({...row,averageStartTimingSource:'post_race'}).reason,'unverified_course_or_start_source');
assert.equal(compareHistoricalRace({...row,racers:racers.map(r=>({...r,entryCourse:1}))}).status,'excluded');

const split=compareChronologicalHoldout([row,{...row,date:'20261119'}],'20261119');
assert.equal(split.status,'audited');
assert.equal(split.training.eligible,1);
assert.equal(split.holdout.eligible,1);
assert.equal(compareChronologicalHoldout([row],'20261119').status,'insufficient_history');
assert.equal(compareChronologicalHoldout([row,row],'20261119').status,'duplicate_races');
assert.equal(compareChronologicalHoldout([row],'not-a-date').status,'invalid_input');

assert.equal(compareHistoricalSet([row,{...row,preRaceSnapshot:false}]).status,'duplicate_races');
assert.equal(compareChronologicalHoldout([row,{...row,resultVerified:false}],'20261119').status,'duplicate_races');
