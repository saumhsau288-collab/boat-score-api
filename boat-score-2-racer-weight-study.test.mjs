import assert from 'node:assert/strict';
import {studyRacerWeights,RACER_WEIGHT_CANDIDATES} from './boat-score-2-racer-weight-study.js';
assert.equal(RACER_WEIGHT_CANDIDATES.length,5);
assert.equal(studyRacerWeights([]).status,'insufficient_verified_history');
assert.equal(studyRacerWeights([{date:'20261118',venue:1,race:1}]).eligible,0);
assert.equal(studyRacerWeights([{date:'20261118',venue:1,race:1},{date:'20261118',venue:1,race:1}]).status,'duplicate_races');
assert.equal(studyRacerWeights(null).status,'invalid_input');
const racers=Array.from({length:6},(_,i)=>({boat:i+1,entryCourse:i+1,nationalWinRate:6,localWinRate:6,motorTwoWinRate:50,recent50WinRate:20,exhibitionScore:50,averageStartTiming:0.15}));
const row={date:'20261118',venue:1,race:1,racers,finishOrder:[1,2,3,4,5,6],
 preRaceSnapshot:true,resultVerified:true,preRaceSourceVerified:true,officialResultSourceVerified:true,
 preRaceSourceUrl:'https://example.org/pre',officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult',
 preRaceCapturedAt:'2026-11-18T09:00:00+09:00',officialCutoffAt:'2026-11-18T10:00:00+09:00',
 entryCourseSource:'verified_pre_race',averageStartTimingSource:'historical_pre_race'};
const rows=[...Array.from({length:3},(_,i)=>({...row,race:i+1})),
 ...Array.from({length:3},(_,i)=>({...row,date:'20261119',race:i+1}))];
const study=studyRacerWeights(rows,{minTrain:3,minHoldout:3});
assert.equal(study.status,'research_only');
assert.equal(study.trainingCount,3);
assert.equal(study.holdoutCount,3);
assert.equal(study.candidateWeights.ability+study.candidateWeights.start+study.candidateWeights.course,100);
assert.equal(studyRacerWeights(rows,{minTrain:4,minHoldout:3}).status,'insufficient_verified_history');
console.log('Racer weight study tests passed (synthetic data only)');

const malformed=studyRacerWeights([null,{},null]);
assert.equal(malformed.status,'insufficient_verified_history');
assert.equal(malformed.eligible,0);
assert.equal(malformed.excludedReasons.unverified_or_invalid_race,3);
