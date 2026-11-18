import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedVenueCandidates } from './verified-venue-candidates.mjs';

test('unverified, errored and unknown venues are excluded', () => {
  assert.deepEqual(verifiedVenueCandidates([
    {venue: 1, verified: false, reason: 'timeout'},
    {venue: 2, verified: true},
    {venue: 3, verified: undefined},
    {venue: 4, verified: 'true'},
  ]), [2]);
});

test('manual venue is not automatically considered verified', () => {
  assert.deepEqual(verifiedVenueCandidates([{venue: 7, verified: false}]), []);
  assert.deepEqual(verifiedVenueCandidates([{venue: 7, verified: true}]), [7]);
});
