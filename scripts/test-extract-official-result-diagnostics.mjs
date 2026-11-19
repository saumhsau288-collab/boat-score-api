import assert from 'node:assert/strict';
import {extractOfficialResultRacers} from './extract-official-result-racers.mjs';
const report=extractOfficialResultRacers({pages:[
 {date:'20261118',venue:2,race:2,status:'fetch_failed'},
 {date:'20261118',venue:2,race:3,status:'raw_html_saved',url:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=02&hd=20261118',html:'<html>no finish table</html>'}
]});
assert.equal(report.rows.length,2);
assert.equal(report.statusCounts.not_saved,1);
assert.equal(report.statusCounts.finish_table_not_found,1);
assert.equal(report.entryCoursesExtractedRaces,0);
assert.equal(report.independentlyVerifiedRaces,0);
console.log('Official result diagnostic status checks passed (synthetic only)');
