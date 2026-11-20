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
console.log('Grouped official metric column tests passed');
