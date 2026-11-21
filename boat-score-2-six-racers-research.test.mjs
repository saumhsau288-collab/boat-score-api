import assert from 'node:assert/strict';
import {extractSixOfficialRacers} from './boat-score-2-six-racers-research.js';

function fixture(count=6,duplicate=false){
 const header='<tr><th rowspan="3">枠</th><th colspan="3">ボートレーサー</th><th>全国</th><th>当地</th><th>モーター</th><th>ボート</th></tr>'+
 '<tr><th>写真</th><th>登録番号/級別 氏名</th><th>F数 L数 平均ST</th><th>勝率 2連率 3連率</th><th>勝率 2連率 3連率</th><th>No 2連率 3連率</th><th>No 2連率 3連率</th></tr>'+
 '<tr><th colspan="7">成績</th></tr>';
 const rows=Array.from({length:count},(_,i)=>{
  const boat=i+1,id=String(4201+(duplicate?0:i));
  return '<tr><td rowspan="4">'+boat+'</td><td rowspan="4">写真</td><td rowspan="4"><a href="/owpc/pc/data/racersearch/profile?toban='+id+'">'+id+' / B1 選手'+boat+'</a></td>'+
  '<td rowspan="4">F0 L0 0.14</td><td rowspan="4">4.42 26.58 41.77</td><td rowspan="4">4.77 30.97 47.79</td><td rowspan="4">65 39.48 54.51</td><td rowspan="4">43 29.05 45.81</td></tr>'+
  '<tr></tr><tr></tr><tr></tr>';
 }).join('');
 return '<table>'+header+rows+'</table>';
}
const ok=extractSixOfficialRacers(fixture());
assert.equal(ok.verified,true,JSON.stringify(ok));
assert.equal(ok.racers.length,6);
assert.deepEqual(ok.racers.map(r=>r.boat),[1,2,3,4,5,6]);
assert.equal(ok.racers[0].racerId,'4201');
assert.equal(ok.racers[0].averageSt,0.14);
assert.equal(ok.racers[0].nationalWinRate,4.42);
assert.equal(ok.racers[0].localWinRate,4.77);
assert.equal(ok.racers[0].motorTwoWinRate,39.48);
assert.equal(extractSixOfficialRacers(fixture(5)).verified,false);
assert.equal(extractSixOfficialRacers(fixture(6,true)).verified,false);
console.log('Six-racer official extraction research tests passed');
