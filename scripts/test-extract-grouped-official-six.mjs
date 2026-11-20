import assert from 'node:assert/strict';
import {extractGroupedOfficialSix as extract} from './extract-grouped-official-six.mjs';
const header='<tr><th rowspan="2">枠</th><th rowspan="2">選手</th><th colspan="2">全国</th><th colspan="2">当地</th><th colspan="2">モーター</th></tr>'+
 '<tr><th>勝率</th><th>2連率</th><th>勝率</th><th>2連率</th><th>番号</th><th>2連率</th></tr>';
const row=i=>'<tr><td>'+i+'</td><td><a href="/owpc/pc/data/racersearch/profile?toban='+(4000+i)+'">選手'+i+'</a></td><td>6.50</td><td>42</td><td>5.20</td><td>36</td><td>12</td><td>44</td></tr>';
const html='<table>'+header+Array.from({length:6},(_,i)=>row(i+1)).join('')+'</table>';
const good=extract(html);
assert.equal(good.verified,true);
assert.equal(extract('<html><table><tr><td>別の表</td></tr></table>'+html+'</html>').verified,true);
assert.equal(extract(html+html).verified,false);
const broken=extract('<table><tr><td>別表</td></tr></table>'+html.replace('4002','4001'));
assert.equal(broken.verified,false);
assert.equal(broken.tableAttempts.length,2);
assert.equal(broken.tableAttempts[1].reason,'six_unique_grouped_racer_rows_required');
assert.equal(broken.tableAttempts[1].candidateRows,6);
assert.equal(good.racers.length,6);
assert.equal(good.racers[0].racerId,'4001');
assert.equal(good.racers[0].nationalWinRate,6.5);
assert.equal(good.racers[0].localWinRate,5.2);
assert.equal(good.racers[0].motorTwoWinRate,44);
assert.equal(extract(html.replace('4002','4001')).verified,false);
assert.equal(extract(html.replace('5.20','不明')).verified,false);

const officialHeader='<tr><th rowspan="3">枠</th><th colspan="3">ボートレーサー</th><th>全国</th><th>当地</th><th>モーター</th><th>ボート</th><th rowspan="3"></th><th colspan="14" rowspan="2">成績</th><th rowspan="3">早見</th></tr>'+
 '<tr><th rowspan="2">写真</th><th rowspan="2">登録番号</th><th rowspan="2">平均ST</th>'+
 '<th rowspan="2">勝率<br>2連率<br>3連率</th><th rowspan="2">勝率<br>2連率<br>3連率</th>'+
 '<th rowspan="2">No<br>2連率<br>3連率</th><th rowspan="2">No<br>2連率<br>3連率</th></tr>'+
 '<tr>'+Array.from({length:7},()=>'<th colspan="2">日別</th>').join('')+'</tr>';
const officialRows=i=>{
 const id=4000+i,profile='/owpc/pc/data/racersearch/profile?toban='+id;
 const cells=[
  '<td rowspan="4">'+i+'</td>',
  '<td rowspan="4"><a href="'+profile+'"><img src="photo.jpg"></a></td>',
  '<td rowspan="4"><a href="'+profile+'">選手'+i+'</a></td>',
  '<td rowspan="4">0.13</td>',
  '<td rowspan="4">6.50<br>42<br>55</td>',
  '<td rowspan="4">5.20<br>36<br>49</td>',
  '<td rowspan="4">15<br>44<br>53</td>',
  '<td rowspan="4">12<br>39<br>45</td>',
  '<td rowspan="4"></td>',
  ...Array.from({length:14},()=>'<td>x</td>'),'<td rowspan="4">2R</td>'
 ];
 return '<tr>'+cells.join('')+'</tr>'+
 Array.from({length:3},()=>'<tr>'+Array.from({length:14},()=>'<td>x</td>').join('')+'</tr>').join('');
};
const officialHtml='<table>'+officialHeader+Array.from({length:6},(_,i)=>officialRows(i+1)).join('')+'</table>';
const officialResult=extract(officialHtml);
assert.equal(officialResult.verified,true,JSON.stringify(officialResult));
assert.equal(officialResult.racers.length,6);
assert.equal(officialResult.racers[0].racerId,'4001');
assert.equal(officialResult.racers[0].nationalWinRate,6.5);
assert.equal(officialResult.racers[0].localWinRate,5.2);
assert.equal(officialResult.racers[0].motorTwoWinRate,44);
const invalidNumbers=extract(officialHtml.replace('6.50<br>42<br>55','6.50<br>42'));
assert.equal(invalidNumbers.verified,false);
assert.deepEqual(invalidNumbers.rowDiagnostics,{boatRows:6,linkedRows:6,numericMetricRows:5});
assert.equal(extract(officialHtml.replace('選手2','別名2')).verified,true);

console.log('Grouped official six-racer extraction tests passed');
