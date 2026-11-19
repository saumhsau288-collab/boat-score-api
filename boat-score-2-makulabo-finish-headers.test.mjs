import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyMakulaboFinishHeaders,annotateMakulaboFinishRows} from './boat-score-2-makulabo-finish-headers.js';
const headers=['枠','選手','1 着','2 着','3 着','4 着','5 着','6 着','走','平均'];
test('accepts labelled Makulabo finish columns',()=>{
 assert.equal(verifyMakulaboFinishHeaders(headers),true);
 const result=annotateMakulaboFinishRows(headers,[['1','立間充宏','24','10','6','4','','5','49','2.20']]);
 assert.equal(result.verified,true);
 assert.deepEqual(result.rows[0].counts,[24,10,6,4,0,5]);
 assert.equal(result.rows[0].runs,49);
});
test('rejects reordered labels and inconsistent run totals',()=>{
 assert.equal(verifyMakulaboFinishHeaders([...headers.slice(0,2),'2 着','1 着',...headers.slice(4)]),false);
 assert.equal(annotateMakulaboFinishRows(headers,[['1','A','24','10','6','4','','5','50','2.20']]).reason,'invalid_finish_totals');
});
