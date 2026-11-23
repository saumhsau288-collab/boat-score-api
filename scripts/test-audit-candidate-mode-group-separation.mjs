import assert from 'node:assert/strict';
import {auditCandidateModeGroupSeparation} from './audit-candidate-mode-group-separation.mjs';
const cases=[
 ['inside', [9,8,7,6,5,4],[.12,.13,.14,.15,.16,.17]],
 ['outside',[4,5,6,7,8,9],[.17,.16,.15,.14,.13,.12]],
 ['equal_inside',[7,7,7,7,7,7],[.11,.12,.13,.14,.15,.16]],
 ['equal_outside',[7,7,7,7,7,7],[.16,.15,.14,.13,.12,.11]],
 ['mixed',[7,9,5,8,6,7.5],[.16,.14,.10,.18,.11,.13]]
];
const rows=cases.map(([id,scores,starts])=>{
 const racers=scores.map((score,i)=>({boat:i+1,score,avgStart:starts[i]}));
 const {report}=auditCandidateModeGroupSeparation(racers);
 assert.equal(report.legacy.sharedFirstCount,0);
 assert.equal(report.legacy.distinctTickets,12);
 assert.equal(report.unrestricted.distinctTickets,12);
 assert.equal(report.unrestricted.sharedFirstCount,report.unrestricted.sharedFirst.length);
 return {id,legacy:report.legacy,unrestricted:report.unrestricted};
});
console.log('CANDIDATE_GROUP_SEPARATION '+JSON.stringify(rows,null,2));
console.log('PASS: group-separation diagnostics preserve 12 unique tickets');
