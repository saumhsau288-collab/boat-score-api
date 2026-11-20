import assert from 'node:assert/strict';
import {auditRetainedReadyCoverage} from './audit-retained-ready-coverage.mjs';
// Counts transcribed from research/20261120-retained-morning-artifact-inventory.md;
// this is a metadata consistency test, not a re-audit of raw artifacts.
const days=[
 {attempted:1152,ready:107,uniqueReadyKeys:80,duplicates:27,explicitSixBoatInputs:0,independentlyAuthenticated:0},
 {attempted:576,ready:46,uniqueReadyKeys:39,duplicates:7,explicitSixBoatInputs:0,independentlyAuthenticated:0},
 {attempted:288,ready:14,uniqueReadyKeys:14,duplicates:0,explicitSixBoatInputs:0,independentlyAuthenticated:0}
];
const x=auditRetainedReadyCoverage({days});
assert.equal(x.status,'coverage_only');assert.equal(x.attempted,2016);
assert.equal(x.ready,167);assert.equal(x.uniqueReadyKeys,133);assert.equal(x.duplicates,34);
assert.equal(x.accuracyCalculationPermitted,false);
assert.equal(auditRetainedReadyCoverage({days:[{...days[0],duplicates:0}]}).status,'invalid_inventory');
console.log(JSON.stringify(x,null,2));
