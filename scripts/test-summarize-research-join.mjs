import assert from 'node:assert/strict';
import {summarizeResearchJoin} from './summarize-research-join.mjs';
const rows=[
 {date:'20261118',venue:1,race:3,parsedPodium:'6-2-3',retrospectiveMainContainsPodium:false,retrospectiveUpsetContainsPodium:true,holdReasons:['pre_race_capture_not_authenticated']},
 {date:'20261118',venue:1,race:7,parsedPodium:null,retrospectiveMainContainsPodium:null,retrospectiveUpsetContainsPodium:null,holdReasons:['official_podium_not_parsed']},
 {date:'20261118',venue:1,race:11,parsedPodium:'1-3-6',retrospectiveMainContainsPodium:false,retrospectiveUpsetContainsPodium:false,holdReasons:['pre_race_capture_not_authenticated']}
];
const s=summarizeResearchJoin({eligibleForAccuracy:0,rows});
assert.equal(s.linked,3);assert.equal(s.parsedPodiums,2);
assert.equal(s.mainContains,0);assert.equal(s.upsetContains,1);
assert.equal(s.eligibleForAccuracy,0);
assert(s.markdown.includes('Not authenticated pre-race accuracy'));
assert(s.markdown.includes('official_podium_not_parsed'));
assert.throws(()=>summarizeResearchJoin({eligibleForAccuracy:1,rows}));
console.log('Research join summary tests passed');
