import test from 'node:test';
import assert from 'node:assert/strict';
import {extractRaceScopedCutoffCandidate} from './extract-race-scoped-cutoff-candidate.mjs';
const expected={date:'20261120',venue:17,race:2};
test('selects only the matching race container',()=>{
 const html='<section data-boat-score-race="1">締切予定時刻 10:16</section>'+
  '<section data-boat-score-race="2">締切予定時刻 10:41</section>';
 const out=extractRaceScopedCutoffCandidate(html,expected);
 assert.equal(out.localCutoff,'10:41');
 assert.equal(out.verified,false);
});
test('never falls back to unrelated page text',()=>{
 const out=extractRaceScopedCutoffCandidate('<div>締切予定時刻 10:16</div>',expected);
 assert.equal(out.status,'race_container_not_found');
});
test('rejects duplicate matching race containers',()=>{
 const html='<section data-boat-score-race="2">締切予定 10:41</section>'.repeat(2);
 assert.equal(extractRaceScopedCutoffCandidate(html,expected).status,'ambiguous_race_container');
});
