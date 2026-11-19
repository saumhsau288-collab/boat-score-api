import assert from 'node:assert/strict';
import {exportReviewedRacerCourseRecords as exportRows} from './export-reviewed-racer-course-records.mjs';
const race={date:'20261118',venue:1,race:3,sourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261118&jcd=01&rno=3',independentlyReviewed:true,
 entrants:Array.from({length:6},(_,i)=>({racerId:String(4000+i),boat:i+1,course:6-i,finish:i+1}))};
const good=exportRows([race],{asOfDate:'20261119'});
assert.equal(good.acceptedRaces,1);
assert.equal(good.records.length,6);
assert.equal(good.records[0].course,6);
assert.equal(good.records[0].boat,1);
assert.equal(good.eligibleForScoreChange,false);
assert.equal(exportRows([{...race,independentlyReviewed:false}],{asOfDate:'20261119'}).acceptedRaces,0);
assert.equal(exportRows([{...race,entrants:race.entrants.map((x,i)=>i===0?{...x,course:5}:x)}],{asOfDate:'20261119'}).acceptedRaces,0);
assert.equal(exportRows([race,race],{asOfDate:'20261119'}).rejected.length,1);
assert.equal(exportRows([race],{asOfDate:'20261118'}).acceptedRaces,0);
console.log('Reviewed official racer-course record export tests passed');
