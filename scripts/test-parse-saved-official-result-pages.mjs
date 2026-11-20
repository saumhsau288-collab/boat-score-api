import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {parseSavedOfficialResultPages as parseSaved} from './parse-saved-official-result-pages.mjs';
const table='<table class="is-w495"><thead><tr><th>着</th></tr></thead>'+
[6,2,3].map((b,i)=>'<tbody><tr><td class="is-fs14">'+['１','２','３'][i]+'</td><td class="is-fs14 is-fBold is-boatColor'+b+'">'+b+'</td></tr></tbody>').join('')+'</table>';
const pay='<td rowspan="2">3連単</td><td><div>'+[6,2,3].map(b=>'<span class="numberSet1_number is-type'+b+'">'+b+'</span>').join('')+'</div></td><td><span class="is-payout1">&yen;8,230</span></td></tr>';
const base={date:'20261118',venue:1,race:3,url:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=01&hd=20261118',status:'raw_html_saved',html:'<a href="/owpc/pc/race/index?jcd=01&hd=20261118">race</a>'+table+pay};
const parse=report=>parseSaved({...report,pages:report.pages.map(p=>p.status==='raw_html_saved'&&typeof p.html==='string'&&!Object.hasOwn(p,'sha256')?{...p,sha256:crypto.createHash('sha256').update(p.html).digest('hex')}:p)});
const ok=parse({pages:[base]});assert.equal(ok.parsed,1);assert.deepEqual(ok.rows[0].podium,[6,2,3]);assert.equal(ok.rows[0].trifectaPayoutYen,8230);assert.equal(ok.verifiedResults,0);assert.equal(ok.eligibleForAccuracy,0);
assert.equal(parse({pages:[{...base,html:base.html.replace('8,230','')}]}).rows[0].reason,'trifecta_payout_mismatch');
assert.equal(parse({pages:[{...base,race:4}]}).rows[0].reason,'race_identity_unconfirmed');
assert.equal(parse({pages:[{...base,status:'fetch_failed',error:'timeout'}]}).rows[0].status,'not_saved');

// Guard against falsely accepting a podium with duplicate finish ranks or boat identities.
const duplicateRankHtml=base.html.replace('<td class="is-fs14">２</td>','<td class="is-fs14">１</td>');
assert.equal(parse({pages:[{...base,html:duplicateRankHtml}]}).rows[0].reason,'podium_invalid');
const duplicateBoatHtml=base.html.replace('<td class="is-fs14 is-fBold is-boatColor2">2</td>','<td class="is-fs14 is-fBold is-boatColor6">6</td>');
assert.equal(parse({pages:[{...base,html:duplicateBoatHtml}]}).rows[0].reason,'podium_invalid');
// Even a valid-looking podium must not pass when the official trifecta disagrees.
const wrongPayoutOrder=base.html.replace('numberSet1_number is-type2','numberSet1_number is-type4').replace('is-type4">2</span>','is-type4">4</span>');
assert.equal(parse({pages:[{...base,html:wrongPayoutOrder}]}).rows[0].reason,'trifecta_payout_mismatch');
// A conflicting boat-color class and boat number must be rejected before scoring.
const conflictingColorHtml=base.html.replace('is-boatColor2">2</td>','is-boatColor4">2</td>');
assert.equal(parse({pages:[{...base,html:conflictingColorHtml}]}).rows[0].reason,'boat_color_mismatch');
// A malformed URL in one saved page must not abort parsing the remaining races.
const mixed=parse({pages:[{...base,url:'not-a-url'},base]});
assert.equal(mixed.rows[0].reason,'invalid_result_url');
assert.equal(mixed.rows[1].status,'parsed_needs_independent_review');
assert.equal(mixed.parsed,1);
const tampered={...base,sha256:crypto.createHash('sha256').update(base.html).digest('hex'),html:base.html.replace('8,230','8,240')};
assert.equal(parse({pages:[tampered]}).rows[0].reason,'raw_html_checksum_unconfirmed');
assert.equal(parse({pages:[{...base,sha256:'invalid'}]}).rows[0].reason,'raw_html_checksum_unconfirmed');
for(const invalidUrl of [
 'http://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=01&hd=20261118',
 'https://user:pass@www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=01&hd=20261118',
 'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&rno=4&jcd=01&hd=20261118',
 'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=01&jcd=02&hd=20261118',
 'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=01&hd=20261118&hd=20261117'
]) {
 assert.equal(parse({pages:[{...base,url:invalidUrl}]}).rows[0].reason,'race_identity_unconfirmed');
}
console.log('Saved official result HTML parsing tests passed');
