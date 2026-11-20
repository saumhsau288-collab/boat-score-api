import assert from 'node:assert/strict';
import {summarizeVenueCourseTendencies} from './summarize-venue-course-tendencies.mjs';
const result=summarizeVenueCourseTendencies([{expected:{venue:18,date:'20261120',race:1}}]);
assert.equal(result.venues.length,24);
assert.equal(result.rejected,1);
assert.equal(result.venues.find(v=>v.venue==='18').races,0);
assert.equal(result.venues.find(v=>v.venue==='18').boats[0].winRate,null);
assert.equal(result.venues.every(v=>v.usableForResearch===false),true);
console.log('Verified venue/course tendency summary tests passed');
