import assert from 'node:assert/strict';
import {auditBaseVsAdjusted} from './audit-base-vs-adjusted.mjs';
const a=[[1,2,3],[1,2,4],[1,2,5],[1,2,6],[1,3,2],[1,3,4]];
const b=[[2,1,3],[2,1,4],[2,1,5],[2,1,6],[2,3,1],[2,3,4]];
const c=[...a].reverse();
const d=[...a.slice(0,5),[3,2,1]];
const report=auditBaseVsAdjusted({records:[
{httpStatus:200,response:{ready:true,main:c,upset:b,basePrediction:{main:a,upset:b},predictionChanged:true}},
{httpStatus:200,response:{ready:true,main:d,upset:b,basePrediction:{main:a,upset:b},predictionChanged:true}},
{httpStatus:200,response:{ready:true,main:a,upset:b,basePrediction:{main:a,upset:b},predictionChanged:false}},
{httpStatus:200,response:{ready:true,main:a,upset:b}},
]});
assert.equal(report.ready,4);
assert.equal(report.comparable,3);
assert.equal(report.missingOrInvalidBase,1);
assert.equal(report.onlyTicketOrderChanged,1);
assert.equal(report.eitherTicketSetChanged,1);
assert.equal(report.noTicketChange,1);
assert.equal(report.predictionChangedFlagMismatch,0);
console.log('Base versus adjusted ticket comparison tests passed');
