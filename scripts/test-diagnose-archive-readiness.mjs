import assert from 'node:assert/strict';
import {diagnoseArchiveReadiness} from './diagnose-archive-readiness.mjs';
const r=diagnoseArchiveReadiness([{records:[
 {date:'20261118',venue:2,race:1,httpStatus:200,response:{ready:false,reason:'source_unavailable'}},
 {date:'20261118',venue:2,race:2,httpStatus:null,error:'timeout'},
 {date:'20261118',venue:2,race:3,httpStatus:200,response:{ready:true}}
]}],['20261118:2:1']);
assert.deepEqual(r.totals,{ready:1,http_non_200:1,missing_response_object:0,http_200_not_ready:1});
assert.equal(r.nonReadyReasons.source_unavailable,1);
assert.equal(r.missingHttpDiagnosticFieldShapes.error,1);
assert.equal(r.focused[0].category,'http_200_not_ready');
console.log('PASS: archived non-ready reasons and missing HTTP metadata are counted');
