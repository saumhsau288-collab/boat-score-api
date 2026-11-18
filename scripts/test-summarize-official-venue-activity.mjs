import assert from 'node:assert/strict';
import {summarizeVenueEvidence} from './summarize-official-venue-activity.mjs';
const r=summarizeVenueEvidence({records:[
 {venue:1,httpStatus:200,sourceCheck:{status:'official_html_source_consistent_not_authenticated'},pageIdentity:{status:'identity_markers_consistent_not_authenticated'},cutoffCandidate:{status:'candidate_needs_official_page_identity_verification'}},
 {venue:1,httpStatus:200,sourceCheck:{status:'official_html_source_consistent_not_authenticated'},pageIdentity:{status:'identity_markers_missing'},cutoffCandidate:{status:'cutoff_not_found'}},
 {venue:2,httpStatus:404},
 {venue:25,httpStatus:200}
]});
assert.deepEqual(r.byVenue['1'],{requested:2,http200:2,sourceConsistent:2,identityConsistent:1,cutoffCandidates:1,verifiedActiveRaces:0});
assert.equal(r.byVenue['2'].http200,0);
assert.equal(r.byVenue['25'],undefined);
assert.equal(r.safeToFilterByActivity,false);
assert.deepEqual(r.verifiedActiveVenues,[]);
console.log('Official venue evidence tests passed');
