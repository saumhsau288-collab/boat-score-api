import assert from 'node:assert/strict';
import {extractOfficialActualStart} from './extract-official-actual-start.mjs';
const table=(items)=>'<table><thead><tr><th>スタート情報</th></tr></thead><tbody>'+items.map(([b,st])=>'<tr><td><span class="table1_boatImage1Number is-type'+b+'">'+b+'</span><span class="table1_boatImage1TimeInner">'+st+'</span></td></tr>').join('')+'</tbody></table>';
const ok=extractOfficialActualStart(table([[1,'.20'],[2,'.16 差し'],[3,'.17'],[4,'.28'],[5,'.27'],[6,'.23']]));
assert.equal(ok.status,'parsed_needs_independent_review');
assert.deepEqual(ok.starts.map(x=>x.st),[.20,.16,.17,.28,.27,.23]);
assert.equal(ok.starts[5].entryCourse,6);
assert.equal(ok.eligibleForCalibration,false);
assert.equal(extractOfficialActualStart(table([[1,'.20']])).status,'start_table_incomplete');
assert.equal(extractOfficialActualStart('<p>no table</p>').status,'start_table_missing');
assert.equal(extractOfficialActualStart(table([[1,'F.01'],[2,'.16'],[3,'.17'],[4,'.28'],[5,'.27'],[6,'.23']])).starts[0].st,null);

const nestedTable='<table class="is-w495"><thead><tr><th>スタート情報</th></tr></thead><tbody>'+
 [[1,'.20'],[2,'.16'],[3,'.17'],[4,'.28'],[5,'.27'],[6,'.23']].map(([b,st])=>
 '<tr><td><div class="table1_boatImage1 is-type1__3rdadd">'+
 '<span class="table1_boatImage1Number is-type'+b+'">'+b+'</span>'+
 '<span class="table1_boatImage1Line is-type1"><span class="table1_boatImage1Boat"></span></span>'+
 '<span class="table1_boatImage1Time"><span class="table1_boatImage1TimeInner ">'+st+'&nbsp;&nbsp; 差し</span></span>'+
 '</div></td></tr>').join('')+'</tbody></table>';
const nested=extractOfficialActualStart(nestedTable);
assert.equal(nested.status,'parsed_needs_independent_review');
assert.deepEqual(nested.starts.map(x=>x.st),[.20,.16,.17,.28,.27,.23]);
assert.deepEqual(nested.starts.map(x=>x.entryCourse),[1,2,3,4,5,6]);

assert.equal(extractOfficialActualStart(table([[1,'unknown'],[2,'.16'],[3,'.17'],[4,'.28'],[5,'.27'],[6,'.23']])).status,'start_table_incomplete');
assert.equal(extractOfficialActualStart(table([[1,'.20garbage'],[2,'.16'],[3,'.17'],[4,'.28'],[5,'.27'],[6,'.23']])).status,'start_table_incomplete');
console.log('official actual start parser tests passed');
