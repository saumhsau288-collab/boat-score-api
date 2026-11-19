import test from 'node:test';
import assert from 'node:assert/strict';
import {extractArchivedRacerFeatures} from './extract-archived-racer-features.mjs';
const block=(n)=>'<tr>'+[`<td rowspan="4">${n} 枠</td>`,'<td rowspan="4">写真</td>',`<td rowspan="4">${4000+n} 選手</td>`,'<td rowspan="4">0.15</td>','<td rowspan="4">6.20</td>','<td rowspan="4">5.40</td>'].join('')+'</tr>';
test('six explicit boat numbers are mapped in order',()=>{
 const html=Array.from({length:6},(_,i)=>block(i+1)).join('');
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',date:'20261119',venue:18,race:2,html});
 assert.equal(r.status,'parsed_archival_features_unverified');
 assert.equal(r.boatMappingVerified,true);
 assert.deepEqual(r.racers.map(x=>x.boat),[1,2,3,4,5,6]);
 assert.equal(r.eligibleForWeightTuning,false);
});
test('nonmatching boat numbers do not pass mapping verification',()=>{
 const html=Array.from({length:6},(_,i)=>block(i+1).replace('rowspan="4">1 枠','rowspan="4">6 枠')).join('');
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',html});
 assert.equal(r.boatMappingVerified,false);
});
