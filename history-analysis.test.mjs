import assert from 'node:assert/strict';
import {normalizeHistoryRow,historicalCourseStats,summarizeVenueCourse,splitHistoricalRacesByDate} from './history-analysis.mjs';
const base={date:'20261101',venue:12,race:1,racerId:'4321',boat:1,course:1,finish:1,source:'official-result',verified:true};
const rows=[
 base,
 {...base}, // duplicate must not count twice
 {...base,date:'20261102',race:2,boat:4,course:4,finish:3},
 {...base,date:'20261103',race:3,boat:2,course:2,finish:2},
 {...base,date:'20261104',race:4,boat:3,course:3,finish:null}, // excluded
 {...base,date:'20261105',race:5,boat:5,course:5,finish:1,verified:false}, // excluded
 {...base,date:'20261120',race:6,boat:1,course:1,finish:1}, // future, excluded
 {...base,venue:11,race:1,boat:1,course:1,finish:2},
 {...base,date:'20261106',race:7,boat:1,course:1,finish:6,racerId:'1234'},
];
assert.equal(normalizeHistoryRow({...base,course:7}),null);
assert.equal(normalizeHistoryRow({...base,finish:0}),null);
const stats=historicalCourseStats(rows,{beforeDate:'20261110'});
const s=stats.find(x=>x.venue===12&&x.racerId==='4321'&&x.course===1);
assert.deepEqual([s.starts,s.wins,s.winPct,s.top2Pct,s.top3Pct],[1,1,100,100,100]);
const course4=stats.find(x=>x.course===4);
assert.deepEqual([course4.starts,course4.wins,course4.top3Pct],[1,0,100]);
const venue=summarizeVenueCourse(rows,{beforeDate:'20261110'});
const v=venue.find(x=>x.venue===12&&x.course===1);
assert.deepEqual([v.starts,v.wins,v.winPct],[2,1,50]);
assert.equal(historicalCourseStats(rows,{beforeDate:'20261101'}).length,0);
console.log('Historical stats checks passed');

const split=splitHistoricalRacesByDate(rows,{tuningBefore:'20261105',holdoutFrom:'20261110'});
assert.equal(split.tuning.length,6);
assert.equal(split.holdout.length,1);
assert.equal(split.excluded.length,2);
assert.equal(split.eligibleForWeightTuning,false);
assert.throws(()=>splitHistoricalRacesByDate(rows,{tuningBefore:'20261120',holdoutFrom:'20261110'}),/boundaries/);
