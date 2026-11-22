import test from 'node:test';
import assert from 'node:assert/strict';
import {extractStartDisplayBoats} from './extract-start-display-boats.mjs';
const cell=(n,st)=>'<td colspan="3"><span class="table1_boatImage1Number is-type'+n+'">'+n+'</span><span class="table1_boatImage1Time">'+st+'</span></td>';
test('extracts six boat-number/ST pairs without asserting actual entry course',()=>{
 const html='<table><th>スタート展示</th>'+[cell(1,'.14'),cell(2,'F.02'),cell(3,'F.06'),cell(4,'.17'),cell(5,'.09'),cell(6,'.12')].join('')+'</table>';
 const r=extractStartDisplayBoats(html);
 assert.equal(r.status,'parsed_start_display');
 assert.equal(r.actualEntryCourseVerified,false);
 assert.deepEqual(r.boats.map(x=>x.boat),[1,2,3,4,5,6]);
 assert.equal(r.boats[1].startDisplayST,'F.02');
});
test('rejects duplicate boats',()=>{
 const html='<table><th>スタート展示</th>'+[1,2,3,4,5,5].map(n=>cell(n,'.12')).join('')+'</table>';
 assert.equal(extractStartDisplayBoats(html).status,'duplicate_boats');
});

test('preserves display order independently from boat numbers',()=>{
 const html='<table><th>スタート展示</th>'+[2,1,3,4,6,5].map(n=>cell(n,'.12')).join('')+'</table>';
 const r=extractStartDisplayBoats(html);
 assert.equal(r.status,'parsed_start_display');
 assert.deepEqual(r.boats.map(x=>x.boat),[2,1,3,4,6,5]);
 assert.equal(r.actualEntryCourseVerified,false);
});
