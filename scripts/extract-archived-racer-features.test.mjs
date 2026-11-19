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

test('reports layout mismatch without fabricating racer metrics',()=>{
 const html='<table><tr><td><a href="/racersearch/profile">選手</a></td></tr></table>';
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',html});
 assert.equal(r.status,'incomplete_six_racer_features');
 assert.equal(r.diagnostics.totalTableRows,1);
 assert.equal(r.diagnostics.rowsWithRacerProfileLinks,1);
 assert.equal(r.diagnostics.fourRowBlockCandidates,0);
 assert.deepEqual(r.racers,[]);
});

test('counts partial four-row blocks but does not treat them as racers',()=>{
 const html='<table><tr><td rowspan="4">1 枠</td><td rowspan="4">写真</td></tr></table>';
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',html});
 assert.equal(r.status,'incomplete_six_racer_features');
 assert.equal(r.diagnostics.rowsWithFourRowCells,1);
 assert.equal(r.diagnostics.fourRowBlockCandidates,0);
 assert.equal(r.racers.length,0);
});

test('extracts racer identity from official profile link when displayed ID is absent',()=>{
 const html=Array.from({length:6},(_,i)=>block(i+1).replace(`${4001+i} 選手`,`<a href="/racersearch/profile/${4001+i}">選手名</a>`)).join('');
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',html});
 assert.equal(r.status,'parsed_archival_features_unverified');
 assert.deepEqual(r.racers.map(x=>x.racerId),['4001','4002','4003','4004','4005','4006']);
 assert.equal(r.boatMappingVerified,true);
});

test('extracts win rates and average ST when values follow labels',()=>{
 const html=Array.from({length:6},(_,i)=>block(i+1).replace('>0.15<','>平均ST 0.15<').replace('>6.20<','>全国 6.20<').replace('>5.40<','>当地 5.40<')).join('');
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',html});
 assert.equal(r.status,'parsed_archival_features_unverified');
 assert.equal(r.racers.length,6);
 assert.equal(r.racers[0].averageStartTiming,0.15);
 assert.equal(r.racers[0].nationalWinRate,6.2);
 assert.equal(r.racers[0].localWinRate,5.4);
});

test('extracts racer ID from profile query parameter',()=>{
 const html=Array.from({length:6},(_,i)=>block(i+1).replace(`${4001+i} 選手`,`<a href="/owpc/pc/data/racersearch/profile?toban=${4001+i}">選手名</a>`)).join('');
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',html});
 assert.equal(r.status,'parsed_archival_features_unverified');
 assert.deepEqual(r.racers.map(x=>x.racerId),['4001','4002','4003','4004','4005','4006']);
});

test('rejects impossible national win rates before prediction',()=>{
 const html=Array.from({length:6},(_,i)=>block(i+1).replace('>6.20<',i===0?'>12.20<':'>6.20<')).join('');
 const r=extractArchivedRacerFeatures({status:'raw_html_saved',html});
 assert.equal(r.status,'incomplete_six_racer_features');
 assert.equal(r.diagnostics.outOfRangeBlocks,1);
 assert.equal(r.racers.length,0);
 assert.equal(r.diagnostics.completeRacerBlocks,5);
});
