import assert from 'node:assert/strict';
import {auditMakulaboHistoricalCutoff as audit} from './audit-makulabo-historical-cutoff.mjs';
const good={raceStartAt:'2026-11-21T11:00:00+09:00',sourcePublishedAt:'2026-11-21T08:00:00+09:00',
 sourceCaptureAt:'2026-11-21T09:00:00+09:00',sampleEndAt:'2026-11-20T22:00:00+09:00',
 publicationVerified:true,sampleEndVerified:true};
assert.equal(audit(good).eligible,true);
assert.equal(audit({...good,publicationVerified:false}).eligible,false);
assert.equal(audit({...good,sampleEndVerified:false}).eligible,false);
assert.equal(audit({...good,sourceCaptureAt:'2026-11-21T12:00:00+09:00'}).eligible,false);
assert.equal(audit({...good,sampleEndAt:'2026-11-21T12:00:00+09:00'}).eligible,false);
assert.equal(audit({...good,sourcePublishedAt:'2026-11-21T12:00:00+09:00'}).eligible,false);
assert.equal(audit({...good,sourcePublishedAt:'2026-11-21T10:00:00+09:00'}).eligible,false);
assert.equal(audit({...good,sourcePublishedAt:'2026-11-21T08:00:00'}).eligible,false);
assert.equal(audit({}).eligible,false);
console.log('Historical Makulabo cutoff audit tests passed');
