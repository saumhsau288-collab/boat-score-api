import assert from 'node:assert/strict';
import {extractOfficialResultRacers as extract} from './extract-official-result-racers.mjs';
// Synthetic fragment follows observed official November 18 Toda 1R table structure.
const tr=(rank,boat,id,name)=>'<tbody><tr><td class="is-fs14">'+rank+'</td>'+
 '<td class="is-fs14 is-fBold is-boatColor'+boat+'">'+boat+'</td>'+
 '<td class="is-p10-0"><span class="is-fs12">'+id+'</span>　<span class="is-fs18 is-fBold is-lh24__3rdadd">'+name+'</span></td><td>1:50</td></tr></tbody>';
const html='<table class="is-w495"><thead><tr><th>着</th><th>枠</th><th>ボートレーサー</th><th>レースタイム</th></tr></thead>'+
 tr('１',1,'5194','大久保　佑香')+tr('２',2,'4940','白石　有美')+tr('３',3,'4843','深尾　巴恵')+
 tr('４',4,'5373','諏訪　玲奈')+tr('５',5,'4987','島倉　都')+tr('６',6,'5439','志賀　美優')+'</table>';
const page={date:'20261118',venue:2,race:1,url:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=02&hd=20261118',status:'raw_html_saved',html};
const out=extract({pages:[page]});
assert.equal(out.parsedRaces,1);
assert.deepEqual(out.rows[0].podium,[1,2,3]);
assert.deepEqual(out.rows[0].racers.map(r=>r.racerId),['5194','4940','4843','5373','4987','5439']);
assert(out.rows[0].racers.every(r=>r.actualEntryCourse===null));
assert.equal(out.eligibleForHistoricalProfile,0);
const startTable=order=>'<table class="is-w495"><thead><tr><th>スタート情報</th></tr></thead><tbody>'+
 order.map(boat=>'<tr><td><span class="table1_boatImage1Number is-type'+boat+'">'+boat+'</span></td></tr>').join('')+'</tbody></table>';
const ordered=extract({pages:[{...page,html:html+startTable([2,1,3,4,5,6])}]}).rows[0];
assert.equal(ordered.entryCoursesExtracted,true);
assert.deepEqual(ordered.startOrderBoats,[2,1,3,4,5,6]);
assert.deepEqual(ordered.racers.map(r=>r.actualEntryCourse),[2,1,3,4,5,6]);
assert.equal(ordered.actualEntryCoursesVerified,false);
const duplicateStart=extract({pages:[{...page,html:html+startTable([1,1,3,4,5,6])}]}).rows[0];
assert.equal(duplicateStart.entryCoursesExtracted,false);
assert(duplicateStart.racers.every(r=>r.actualEntryCourse===null));

assert.equal(extract({pages:[{...page,html:html.replace('5439','5194')}]}).parsedRaces,0);
assert.equal(extract({pages:[{...page,url:page.url.replace('jcd=02','jcd=03')}]}).rows[0].status,'invalid_official_identity');
assert.equal(extract({pages:[{...page,status:'fetch_failed'}]}).rows[0].status,'not_saved');
// Real-world pattern: Toda 2026-11-18 2R has two overturned boats,
 // which must not be mislabeled as 5th or 6th place.
const overturned=html.replace('５</td>','転</td>').replace('６</td>','転</td>');
const nonfinish=extract({pages:[{...page,html:overturned+startTable([1,2,3,4,5,6])}]}).rows[0];
assert.equal(nonfinish.status,'parsed_needs_independent_review');
assert.deepEqual(nonfinish.racers.map(r=>r.finish),[1,2,3,4,null,null]);
assert.deepEqual(nonfinish.racers.map(r=>r.resultStatus),[null,null,null,null,'転','転']);
assert.deepEqual(nonfinish.podium,[1,2,3]);
assert.equal(nonfinish.racers[4].actualEntryCourse,5);
assert.equal(nonfinish.eligibleForScoreChange,false);
console.log('Saved official result racer finish parser tests passed');
