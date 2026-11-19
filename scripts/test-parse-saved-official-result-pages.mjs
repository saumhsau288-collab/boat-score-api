import assert from 'node:assert/strict';
import {parseSavedOfficialResultPages as parse} from './parse-saved-official-result-pages.mjs';
const table='<table class="is-w495"><thead><tr><th>着</th></tr></thead>'+
[6,2,3].map((b,i)=>'<tbody><tr><td class="is-fs14">'+['１','２','３'][i]+'</td><td class="is-fs14 is-fBold is-boatColor'+b+'">'+b+'</td></tr></tbody>').join('')+'</table>';
const pay='<td rowspan="2">3連単</td><td><div>'+[6,2,3].map(b=>'<span class="numberSet1_number is-type'+b+'">'+b+'</span>').join('')+'</div></td><td><span class="is-payout1">&yen;8,230</span></td></tr>';
const base={date:'20261118',venue:1,race:3,url:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=01&hd=20261118',status:'raw_html_saved',html:'<a href="/owpc/pc/race/index?jcd=01&hd=20261118">race</a>'+table+pay};
const ok=parse({pages:[base]});assert.equal(ok.parsed,1);assert.deepEqual(ok.rows[0].podium,[6,2,3]);assert.equal(Object.hasOwn(ok.rows[0],'trifectaPayoutYen'),false);assert.equal(ok.verifiedResults,0);assert.equal(ok.eligibleForAccuracy,0);
assert.deepEqual(parse({pages:[{...base,html:base.html.replace(pay,'')}]}).rows[0].podium,[6,2,3]);
assert.equal(parse({pages:[{...base,race:4}]}).rows[0].reason,'race_identity_unconfirmed');
assert.equal(parse({pages:[{...base,status:'fetch_failed',error:'timeout'}]}).rows[0].status,'not_saved');
console.log('Saved official result HTML parsing tests passed');
