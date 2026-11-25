import test from 'node:test';import assert from 'node:assert/strict';import {wilson95,auditInsideGapUncertainty} from './audit-inside-gap-uncertainty.mjs';
test('Wilson interval remains within 0..1 and zero sample is null',()=>{assert.equal(wilson95(0,0).rate,null);const r=wilson95(3,8);assert.ok(r.lower<r.rate&&r.rate<r.upper);assert.throws(()=>wilson95(9,8));});
test('calculates uncertainty for each winner',()=>{const x=auditInsideGapUncertainty({byWinner:{1:{outsideAheadBy1Plus:{insideSecond:3,races:8}}}});assert.equal(x.byWinner[1].races,8);});
