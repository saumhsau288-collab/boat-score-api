import assert from 'node:assert/strict';
import {predictTwelveIndependentHypotheses} from './predict-twelve-independent-hypotheses.mjs';
const cases=[
 ['outside_best',[7,8,6,5,4,10],[.14,.13,.15,.16,.17,.12],[2]],
 ['inside_best',[10,8,6,5,4,7],[.12,.13,.15,.16,.17,.14],[1]],
 ['inside_tie',[9,9,6,5,4,10],[.12,.13,.15,.16,.17,.14],[1,2]],
 ['all_equal',[7,7,7,7,7,7],[.12,.13,.15,.16,.17,.14],[]]
];
for(const [name,scores,starts,excluded] of cases){
 const racers=scores.map((score,i)=>({boat:i+1,score,avgStart:starts[i]}));
 const p=predictTwelveIndependentHypotheses(racers,{candidateMode:'rank_relative'});
 assert.equal(p.distinctTickets,12);
 assert.ok(p.upset.every(x=>!excluded.includes(x.ticket[0])),name);
 console.log('STRONG_INSIDE_LOSES '+JSON.stringify({scenario:name,excludedInsideFirst:excluded,upsetFirst:p.upset.map(x=>x.ticket[0])}));
}
const swapped=[{boat:1,course:5,score:10,avgStart:.12},{boat:2,course:2,score:8,avgStart:.13},{boat:3,course:3,score:7,avgStart:.14},{boat:4,course:4,score:6,avgStart:.15},{boat:5,course:1,score:9,avgStart:.16},{boat:6,course:6,score:5,avgStart:.17}];
const swappedResult=predictTwelveIndependentHypotheses(swapped,{candidateMode:'rank_relative'});
assert.ok(swappedResult.upset.every(x=>x.ticket[0]!==5));
console.log('PASS: strongest inside-course competitor loses, including changed entry course');
