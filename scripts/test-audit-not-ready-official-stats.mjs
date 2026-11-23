import assert from 'node:assert/strict';
import {auditNotReadyOfficialStats} from './audit-not-ready-official-stats.mjs';
const report=auditNotReadyOfficialStats([{records:[
 {httpStatus:200,response:{ready:false,officialStatsRetry:'official_http_403',officialVerified:false,statsVerified:false,missingInputs:['a']}},
 {httpStatus:200,response:{ready:false,officialStatsRetry:'timeout',officialVerified:false,statsVerified:false,missingInputs:[]}},
 {httpStatus:200,response:{ready:true,officialStatsRetry:'ignored'}},
 {httpStatus:403,response:{ready:false,officialStatsRetry:'ignored'}}
]}]);
assert.equal(report.total,2);
assert.equal(report.counts.officialStatsRetry.official_http_403,1);
assert.equal(report.counts.officialStatsRetry.timeout,1);
assert.equal(report.counts.officialVerified.false,2);
assert.equal(report.counts.missingInputs.array,2);
assert.equal(auditNotReadyOfficialStats([]).total,0);
console.log('PASS: official stats diagnostics separated without inferring upstream facts');
