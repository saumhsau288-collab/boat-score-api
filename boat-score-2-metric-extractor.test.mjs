import assert from 'node:assert/strict';
import {extractOfficialMetrics} from './boat-score-2-metric-extractor.js';
const header='<tr><th>枠</th><th>選手</th><th>全国勝率</th><th>当地勝率</th><th>モーター2連対率</th></tr>';
const row=i=>'<tr><td>'+i+'</td><td><a href="/owpc/pc/data/racersearch/profile?toban='+(4000+i)+'">選手'+i+'</a></td><td>6.50</td><td>5.20</td><td>35.0%</td></tr>';
const html='<table>'+header+Array.from({length:6},(_,i)=>row(i+1)).join('')+'</table>';
const parsed=extractOfficialMetrics(html);
assert.equal(parsed.verified,true);
assert.equal(parsed.racers.length,6);
assert.equal(parsed.racers[0].nationalWinRate,6.5);
assert.equal(parsed.racers[0].motorTwoWinRate,35);
assert.equal(extractOfficialMetrics(html.replace('35.0%','不明')).verified,false);
const noHeader=extractOfficialMetrics(html.replace('全国勝率','総合指数'));
assert.equal(noHeader.verified,false);
assert.equal(noHeader.diagnostics.tableCount,1);
assert.equal(noHeader.diagnostics.matchingHeaderTables,0);
assert.equal(noHeader.diagnostics.matchingMappedTables,0);
assert.equal(extractOfficialMetrics(html.replace('4002','4001')).verified,false);
const grouped=extractOfficialMetrics('<table><tr><th>枠</th><th>全国</th><th>当地</th><th>モーター</th></tr><tr><th>写真</th><th>勝率</th><th>勝率</th><th>2連率</th></tr></table>');
assert.equal(grouped.verified,false);
assert.equal(grouped.reason,'grouped_official_headers_need_verified_column_mapping');
assert.equal(grouped.diagnostics.groupedHeaderTables,1);
assert.deepEqual(grouped.diagnostics.tableRowCounts,[2]);
const merged=extractOfficialMetrics('<table><tr><th colspan="2">全国</th><th rowspan="2">当地</th><th>モーター</th></tr></table>');
assert.equal(merged.verified,false);
assert.equal(merged.diagnostics.tablesWithColspan,1);
assert.equal(merged.diagnostics.tablesWithRowspan,1);

const groupedHeader='<tr><th rowspan="3">枠</th><th colspan="3">ボートレーサー</th><th>全国</th><th>当地</th><th>モーター</th><th>ボート</th><th rowspan="3"></th><th colspan="14" rowspan="2">成績</th><th rowspan="3">早見</th></tr>'+
 '<tr><th rowspan="2">写真</th><th rowspan="2">登録番号</th><th rowspan="2">平均ST</th><th rowspan="2">勝率<br>2連率<br>3連率</th><th rowspan="2">勝率<br>2連率<br>3連率</th><th rowspan="2">No<br>2連率<br>3連率</th><th rowspan="2">No<br>2連率<br>3連率</th></tr>'+
 '<tr>'+Array.from({length:7},()=>'<th colspan="2">日別</th>').join('')+'</tr>';
const groupedRows=i=>{
 const id=4200+i,link='/owpc/pc/data/racersearch/profile?toban='+id;
 const prefix='<td class="is-boatColor'+i+'" rowspan="4">'+String.fromCharCode(0xff10+i)+'</td>'+
 '<td rowspan="4"><a href="'+link+'"><img src="photo.jpg"></a></td>'+
 '<td rowspan="4"><a href="'+link+'">選手'+i+'</a></td>'+
 '<td rowspan="4">F0 L0 0.14</td><td rowspan="4">4.42<br>26.58<br>41.77</td>'+
 '<td rowspan="4">4.77<br>30.97<br>47.79</td><td rowspan="4">65<br>39.48<br>54.51</td>'+
 '<td rowspan="4">43<br>29.05<br>45.81</td><td rowspan="4"></td>';
 const trailing=Array.from({length:14},()=>'<td>x</td>').join('');
 return '<tr>'+prefix+trailing+'<td rowspan="4">2R</td></tr>'+
  Array.from({length:3},()=>'<tr>'+trailing+'</tr>').join('');
};
const liveShape='<table>'+groupedHeader+Array.from({length:6},(_,i)=>groupedRows(i+1)).join('')+'</table>';
const liveParsed=extractOfficialMetrics(liveShape);
assert.equal(liveParsed.verified,true,JSON.stringify(liveParsed));
assert.deepEqual(liveParsed.racers.map(r=>r.racerId),['4201','4202','4203','4204','4205','4206']);
assert.equal(liveParsed.racers[0].nationalWinRate,4.42);
assert.equal(liveParsed.racers[0].localWinRate,4.77);
assert.equal(liveParsed.racers[0].motorTwoWinRate,39.48);
assert.equal(extractOfficialMetrics(liveShape.replace('39.48','不明')).verified,false);

console.log('Official metric extraction tests passed');
