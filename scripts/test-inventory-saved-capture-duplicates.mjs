import assert from 'node:assert/strict';
import {inventorySavedCaptureDuplicates} from './inventory-saved-capture-duplicates.mjs';
const report=inventorySavedCaptureDuplicates({records:[
 {date:'20261118',venue:1,race:2,receivedAt:'2026-11-18T00:00:00Z'},
 {date:'20261118',venue:'01',race:'02',receivedAt:'2026-11-18T00:01:00Z'},
 {date:'20261118',venue:2,race:2},
 {date:'20260230',venue:1,race:1},
 null
]});
assert.equal(report.totalRecords,5);
assert.equal(report.uniqueValidRaces,2);
assert.equal(report.invalidRecords,2);
assert.equal(report.duplicateRaceKeys,1);
assert.equal(report.duplicateRecords,2);
assert.equal(report.duplicates[0].key,'20261118:1:2');
assert.throws(()=>inventorySavedCaptureDuplicates({}),/records_required/);
console.log('PASS: duplicate inventory retains all repeated race keys without selecting one');
