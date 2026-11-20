import assert from 'node:assert/strict';
import {inspectOfficialResultMarkup} from './inspect-official-result-markup.mjs';
const html='<html><table><tr><th>着順</th><th>艇番</th></tr><tr><td>1</td><td>4</td></tr></table></html>';
const result=inspectOfficialResultMarkup(html);
assert.equal(result.tableCount,1);
assert.equal(result.tableSamples[0].rowCount,2);
assert.equal(result.tableSamples[0].rows[1].cellCount,2);
assert.equal(result.eligibleForCalibration,false);
console.log('Official result markup diagnostic tests passed');
