import assert from 'node:assert/strict';
import {identifyOfficialGroupedMetricColumns as identify} from './identify-official-grouped-metric-columns.mjs';
const html='<table><tr><th rowspan="2">枠</th><th colspan="2">全国</th><th colspan="2">当地</th><th colspan="2">モーター</th></tr>'+
 '<tr><th>勝率</th><th>2連率</th><th>勝率</th><th>2連率</th><th>番号</th><th>2連率</th></tr>'+
 '<tr><td>1</td><td>6.50</td><td>42</td><td>5.20</td><td>36</td><td>12</td><td>44</td></tr></table>';
const out=identify(html);
assert.equal(out.verified,true);
assert.deepEqual(out.columns,{nationalWinRate:1,localWinRate:3,motorTwoWinRate:6});
const bad=identify(html.replace('<th>勝率</th><th>2連率</th><th>勝率</th>','<th>勝率</th><th>2連率</th><th>不明</th>'));
assert.equal(bad.verified,false);
assert.equal(bad.reason,'ambiguous_grouped_metric_columns');
assert.equal(bad.headerRowCount,2);
assert.equal(bad.headerGridLabels[0][1],'全国');
assert.equal(bad.headerGridLabels[1][3],null);

const official='<table><tr><th rowspan="3">枠</th><th colspan="3">ボートレーサー</th><th>全国</th><th>当地</th><th>モーター</th><th>ボート</th><th rowspan="3">空</th><th colspan="14" rowspan="2">成績</th><th rowspan="3">早見</th></tr>'+
 '<tr><th rowspan="2">写真</th><th rowspan="2">登録番号</th><th rowspan="2">平均ST</th>'+
 '<th rowspan="2">勝率<br>2連率<br>3連率</th><th rowspan="2">勝率<br>2連率<br>3連率</th>'+
 '<th rowspan="2">No<br>2連率<br>3連率</th><th rowspan="2">No<br>2連率<br>3連率</th></tr>'+
 '<tr>'+Array.from({length:7},()=>'<th colspan="2">日別</th>').join('')+'</tr>'+
 '<tr>'+Array.from({length:24},()=>'<td>x</td>').join('')+'</tr></table>';
const officialLayout=identify(official);
assert.equal(officialLayout.verified,true);
assert.equal(officialLayout.mode,'stacked_triplet');
assert.deepEqual(officialLayout.columns,{nationalWinRate:4,localWinRate:5,motorTwoWinRate:6});
assert.equal(identify(official.replace('No<br>2連率<br>3連率','モーター')).verified,false);

console.log('Grouped official metric column tests passed');
