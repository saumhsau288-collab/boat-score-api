import assert from 'node:assert/strict';
import {inspectResearchCanonicalRaceIdentity as check} from './inspect-research-canonical-race-identity.mjs';
const race={date:'20261120',venue:2,race:1};
const u='https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261120&amp;jcd=02&amp;rno=1';
assert.equal(check('<link rel="canonical" href="'+u+'"><a href="?rno=2">other race</a>',{race}).status,'canonical_race_consistent_not_authenticated');
assert.equal(check('<meta property="og:url" content="'+u+'">',{race}).status,'canonical_race_consistent_not_authenticated');
assert.equal(check('<link rel="canonical" href="'+u.replace('rno=1','rno=2')+'">',{race}).status,'canonical_race_mismatch');
assert.equal(check('<a href="'+u+'">navigation only</a>',{race}).status,'canonical_identity_missing');
console.log('Research canonical page race identity tests passed');
