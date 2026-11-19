import assert from 'node:assert/strict';
import {experimentalRacerScore,experimentalRaceRanking,explainRacerComparison} from './boat-score-2-racer-experiment.js';
const base={nationalWinRate:6,localWinRate:8,averageStartTiming:0.15,entryCourse:1};
const a=experimentalRacerScore(base);
assert.equal(a.status,'evaluated');
assert.equal(a.components.winRateMean,7);
assert.equal(a.score,69);
assert.ok(experimentalRacerScore({...base,averageStartTiming:0.12}).score>a.score);
assert.ok(experimentalRacerScore({...base,entryCourse:2}).score<a.score);
assert.equal(experimentalRacerScore({...base,averageStartTiming:null}).status,'insufficient_or_invalid_data');
const racers=Array.from({length:6},(_,i)=>({...base,boat:i+1,entryCourse:i+1}));
assert.equal(experimentalRaceRanking(racers).ranked[0].boat,1);
console.log('Offline racer experiment passed');

const weakInside=experimentalRacerScore({...base,nationalWinRate:3,localWinRate:3,averageStartTiming:0.22,entryCourse:1});
const strongOutside=experimentalRacerScore({...base,nationalWinRate:9,localWinRate:9,averageStartTiming:0.11,entryCourse:5});
assert.ok(strongOutside.score>weakInside.score,'Strong outside racer must outrank weak inside racer');
const sameAbilityOutside=experimentalRacerScore({...base,entryCourse:5});
assert.ok(a.score>sameAbilityOutside.score,'Inside advantage applies when racer ability and ST are equal');
const strongInsideSlowStart=experimentalRacerScore({...base,averageStartTiming:0.24});
assert.ok(a.score>strongInsideSlowStart.score,'Start timing remains material even in the same course');

const explanation=explainRacerComparison({...base,nationalWinRate:9,localWinRate:9,entryCourse:5},
 {...base,nationalWinRate:3,localWinRate:3,entryCourse:1});
assert.equal(explanation.status,'evaluated');
assert.equal(explanation.winner,'first');
assert.ok(explanation.componentDifferences.ability>0);
assert.ok(explanation.componentDifferences.course<0);
assert.equal(explainRacerComparison(base,{...base,averageStartTiming:null}).status,'insufficient_data');

assert.equal(experimentalRaceRanking(racers.map((r,i)=>i===5?{...r,entryCourse:1}:r)).status,'invalid_entry_courses');
assert.equal(experimentalRaceRanking(racers.map((r,i)=>i===5?{...r,entryCourse:null}:r)).status,'invalid_entry_courses');
assert.equal(experimentalRaceRanking(racers.map((r,i)=>i===5?{...r,entryCourse:7}:r)).status,'invalid_entry_courses');
