import assert from 'node:assert/strict';
import {parseOfficialBoatRows} from './boat-score-2-boat-mapping.js';
const row=(boat,id)=>'<tr><td>'+boat+'</td><td><a href="/owpc/pc/data/racersearch/profile?toban='+id+'">選手'+boat+'</a></td></tr>';
const html=Array.from({length:6},(_,i)=>row(i+1,4001+i)).join('');
const result=parseOfficialBoatRows(html);
assert.equal(result.verified,true);
assert.deepEqual(result.racers.map(r=>r.boat),[1,2,3,4,5,6]);
assert.equal(parseOfficialBoatRows(html+row(1,5000)).verified,false);
assert.equal(parseOfficialBoatRows(html.replace('4002','4001')).verified,false);
assert.equal(parseOfficialBoatRows('<a href="/owpc/pc/data/racersearch/profile?toban=4001">選手</a>').verified,false);

const officialRow=(boat,id)=>'<tr><td class="is-boatColor'+boat+'" rowspan="4">'+String.fromCharCode(0xff10+boat)+'</td>'+
 '<td rowspan="4"><a href="/owpc/pc/data/racersearch/profile?toban='+id+'"><img src="photo.jpg"></a></td>'+
 '<td rowspan="4"><a href="/owpc/pc/data/racersearch/profile?toban='+id+'">選手'+boat+'</a></td>'+
 '<td rowspan="4">F0 L0 0.14</td></tr>'+
 '<tr><td>1</td></tr><tr><td>.14</td></tr><tr><td>１</td></tr>';
const official=Array.from({length:6},(_,i)=>officialRow(i+1,4201+i)).join('');
assert.equal(parseOfficialBoatRows(official).verified,true);
assert.deepEqual(parseOfficialBoatRows(official).racers.map(r=>r.boat),[1,2,3,4,5,6]);
assert.equal(parseOfficialBoatRows(official.replace('is-boatColor2','is-boatColor3')).verified,false);
assert.equal(parseOfficialBoatRows(official.replace('toban=4202','toban=4201')).verified,false);
assert.equal(parseOfficialBoatRows(official.replace('>選手2</a>','>別名2</a>').replace('toban=4202','toban=4203')).verified,false);

console.log('Boat mapping tests passed');
