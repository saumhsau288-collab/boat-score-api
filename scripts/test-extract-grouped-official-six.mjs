import assert from 'node:assert/strict';
import {extractGroupedOfficialSix as extract} from './extract-grouped-official-six.mjs';
const header='<tr><th rowspan="2">枠</th><th rowspan="2">選手</th><th colspan="2">全国</th><th colspan="2">当地</th><th colspan="2">モーター</th></tr>'+
 '<tr><th>勝率</th><th>2連率</th><th>勝率</th><th>2連率</th><th>番号</th><th>2連率</th></tr>';
const row=i=>'<tr><td>'+i+'</td><td><a href="/owpc/pc/data/racersearch/profile?toban='+(4000+i)+'">選手'+i+'</a></td><td>6.50</td><td>42</td><td>5.20</td><td>36</td><td>12</td><td>44</td></tr>';
const html='<table>'+header+Array.from({length:6},(_,i)=>row(i+1)).join('')+'</table>';
const good=extract(html);
assert.equal(good.verified,true);
assert.equal(good.racers.length,6);
assert.equal(good.racers[0].racerId,'4001');
assert.equal(good.racers[0].nationalWinRate,6.5);
assert.equal(good.racers[0].localWinRate,5.2);
assert.equal(good.racers[0].motorTwoWinRate,44);
assert.equal(extract(html.replace('4002','4001')).verified,false);
assert.equal(extract(html.replace('5.20','不明')).verified,false);
console.log('Grouped official six-racer extraction tests passed');
