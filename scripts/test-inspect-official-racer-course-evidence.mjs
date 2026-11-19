import assert from 'node:assert/strict';
import {inspectOfficialRacerCourseEvidence as inspect} from './inspect-official-racer-course-evidence.mjs';
const page={date:'20261118',venue:1,race:3,url:'https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261118&jcd=01&rno=3',status:'raw_html_saved',
 html:'<th>着</th><th>進入</th>'+Array.from({length:6},(_,i)=>'<a href="/owpc/pc/data/racersearch/profile?toban='+(4001+i)+'">racer</a>').join('')};
const r=inspect({pages:[page]});
assert.equal(r.rows[0].racerCountCandidate,6);
assert.equal(r.rows[0].entryCourseHeadings,1);
assert.equal(r.rows[0].racerCourseVerified,false);
assert.equal(r.eligibleForHistoricalProfile,0);
assert(r.rows[0].missing.includes('six_actual_entry_courses_not_confirmed'));
assert.equal(inspect({pages:[{...page,url:page.url.replace('jcd=01','jcd=02')}]}).rows[0].status,'invalid_official_result_identity');
assert.equal(inspect({pages:[{...page,status:'fetch_failed'}]}).rows[0].status,'not_saved');
assert.throws(()=>inspect({pages:null}));
console.log('Offline official racer-course evidence inspection tests passed');
