import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCutoffFromHtmlScheduleTable as parse} from './extract-cutoff-from-html-schedule-table.mjs';
const times=['10:16','10:42','11:08','11:34','12:00','12:26','12:53','13:24','13:52','14:21','14:51','15:32'];
const row=(label,values)=>'<tr><th>'+label+'</th>'+values.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
const table='<table>'+row('レース',Array.from({length:12},(_,i)=>String(i+1)))+row('締切予定時刻',times)+'</table>';
test('race 2 selects second column, not first time in HTML',()=>{
 const out=parse({html:'<p>締切予定時刻 00:00</p>'+table,expectedRace:2,sourceVerified:true});
 assert.equal(out.cutoffJst,'10:42');assert.equal(out.verified,true);
});
test('race 6 selects 12:26',()=>assert.equal(parse({html:table,expectedRace:6,sourceVerified:true}).cutoffJst,'12:26'));
test('unverified source cannot be promoted',()=>assert.equal(parse({html:table,expectedRace:2}).verified,false));
test('duplicate matching tables are rejected',()=>assert.equal(parse({html:table+table,expectedRace:2,sourceVerified:true}).reason,'ambiguous_schedule_tables'));
test('incomplete 12-race table is rejected',()=>assert.equal(parse({html:table.replace('<td>12</td>',''),expectedRace:2,sourceVerified:true}).verified,false));
