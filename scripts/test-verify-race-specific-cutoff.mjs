import assert from 'node:assert/strict';
import {verifyRaceSpecificCutoff} from './verify-race-specific-cutoff.mjs';
const expected={date:'20261120',venue:'18',race:1};
const source={officialDomainVerified:true,sourceDocumentVerified:true,raceIdentityVerified:true,
 date:'20261120',venue:'18',race:1,cutoffLabelVerified:true,cutoffJst:'08:43',
 sourceCaptureVerified:true,sourceCapturedAtEpochMs:Date.parse('2026-11-19T23:40:00Z')};
const good=verifyRaceSpecificCutoff({expected,source});
assert.equal(good.verified,true);
assert.equal(good.cutoffEpochMs,Date.parse('2026-11-19T23:43:00Z'));
assert.equal(verifyRaceSpecificCutoff({expected,source:{...source,race:3}}).verified,false);
assert.equal(verifyRaceSpecificCutoff({expected,source:{...source,cutoffLabelVerified:false}}).verified,false);
assert.equal(verifyRaceSpecificCutoff({expected,source:{...source,officialDomainVerified:false}}).verified,false);
assert.equal(verifyRaceSpecificCutoff({expected,source:{...source,sourceCaptureVerified:false}}).verified,false);
console.log('Race-specific cutoff verification: five synthetic cases passed');
