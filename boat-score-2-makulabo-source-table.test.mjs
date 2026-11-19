import test from 'node:test';
import assert from 'node:assert/strict';
import {extractMakulaboFinishTable} from './boat-score-2-makulabo-source-table.js';
const headers=['枠','選手','1 着','2 着','3 着','4 着','5 着','6 着','走','平均'];
const tr=(cells,tag)=>'<tr>'+cells.map(x=>'<'+tag+'>'+x+'</'+tag+'>').join('')+'</tr>';
const rows=Array.from({length:6},(_,i)=>[String(i+1),'選手'+(i+1),'24','10','6','4','','5','49','2.20']);
test('extracts labelled six-boat finish table',()=>{
 const html='<h2>枠番別ヒートマップ</h2><table>'+tr(headers,'th')+rows.map(r=>tr(r,'td')).join('')+'</table>';
 const result=extractMakulaboFinishTable(html);
 assert.equal(result.verified,true);
 assert.equal(result.parsedRows[0].runs,49);
 assert.deepEqual(result.parsedRows[0].counts,[24,10,6,4,0,5]);
});
test('rejects incomplete table',()=>{
 const html='<table>'+tr(headers,'th')+rows.slice(1).map(r=>tr(r,'td')).join('')+'</table>';
 assert.equal(extractMakulaboFinishTable(html).reason,'six_distinct_boats_required');
});
