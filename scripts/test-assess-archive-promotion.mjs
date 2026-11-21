import test from 'node:test';import assert from 'node:assert/strict';import {assessArchivePromotion} from './assess-archive-promotion.mjs';
const baseline={exactRate:27/307,firstRate:170/307,membershipRate:583/921};
test('blocks two-stage regression even if podium selection improves',()=>{const r=assessArchivePromotion({candidate:{exactRate:16/307,firstRate:163/307,membershipRate:621/921},baseline});assert.equal(r.promote,false);assert.equal(r.beatsBaseline,false);assert.ok(r.delta.membershipRate>0);});
test('blocks promising but unverified retrospective results',()=>{const r=assessArchivePromotion({candidate:{exactRate:.12,firstRate:.60,membershipRate:.75},baseline});assert.equal(r.promote,false);assert.equal(r.beatsBaseline,true);assert.equal(r.preRaceVerified,false);});
