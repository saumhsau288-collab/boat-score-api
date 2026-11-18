import assert from 'node:assert/strict';
import {auditMorningCoverage} from './audit-morning-coverage-research.mjs';
const r=auditMorningCoverage({captureStart:'2026-11-17T23:00:00.000Z',records:[
 {venue:2,race:1,httpStatus:200,response:{ready:true}},
 {venue:2,race:2,error:'timeout'},
 {venue:8,race:1,httpStatus:200,response:{ready:false}},
 {venue:2,race:1,httpStatus:200,response:{ready:true}}
]});
assert.equal(r.inMorningWindow,true);
assert.equal(r.authenticatedBeforeRace,false);
assert.equal(r.recordsRequestedInMorningWindow,0);
assert.equal(r.captureDateMatchesJst,false);
assert.equal(r.byVenue[2].ready,2);
assert.equal(r.byVenue[2].timeout,1);
assert.deepEqual(r.duplicates,['2:1']);
assert.equal(auditMorningCoverage({captureStart:'2026-11-18T13:00:00Z',records:[]}).inMorningWindow,false);
const timed=auditMorningCoverage({date:'20261118',captureStart:'2026-11-17T23:00:00.000Z',records:[
 {venue:2,race:1,requestedAt:'2026-11-17T23:01:00.000Z',httpStatus:200,response:{ready:true}},
 {venue:2,race:2,requestedAt:'2026-11-18T01:01:00.000Z',error:'timeout'}
]});
assert.equal(timed.captureDateMatchesJst,true);
assert.equal(timed.recordsRequestedInMorningWindow,1);
const noDate=auditMorningCoverage({captureStart:'invalid',records:[{venue:1,race:1,requestedAt:'not-a-date',error:'timeout'}]});
assert.equal(noDate.captureDateMatchesJst,false);
assert.equal(noDate.recordsRequestedInMorningWindow,0);
assert.equal(noDate.inMorningWindow,false);
assert.throws(()=>auditMorningCoverage({}));
console.log('Morning capture coverage research tests passed');
