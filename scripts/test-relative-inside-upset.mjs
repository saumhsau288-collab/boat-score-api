import assert from 'node:assert/strict';
import {predictTwelveIndependentHypotheses} from './predict-twelve-independent-hypotheses.mjs';
const cases=[
 ['strong_four_loses_to_five',[3,4,5,10,8,6],[.16,.16,.16,.12,.13,.14]],
 ['strong_two_loses_to_three',[4,10,8,6,5,3],[.16,.12,.13,.14,.15,.16]],
 ['strong_six_no_outer',[3,4,5,6,7,10],[.17,.16,.15,.14,.13,.12]],
 ['all_equal',[7,7,7,7,7,7],[.12,.13,.14,.15,.16,.17]]
];
for(const [scenario,scores,starts] of cases){
 const racers=scores.map((score,i)=>({boat:i+1,score,avgStart:starts[i]}));
 const result=predictTwelveIndependentHypotheses(racers,{candidateMode:'rank_relative'});
 assert.equal(result.upset.length,6);
 assert.equal(result.distinctTickets,12);
 const tied=scores.every(s=>s===scores[0]);
 for(const pick of result.upset){
  const winner=racers.find(r=>r.boat===pick.ticket[0]);
  assert.ok(tied||racers.some(r=>r.boat<winner.boat&&r.score>winner.score),scenario+': '+pick.ticket);
 }
 console.log('RELATIVE_INSIDE_UPSET '+JSON.stringify({scenario,upsetFirst:result.upset.map(x=>x.ticket[0])}));
}
const moved=[{boat:1,course:5,score:8,avgStart:.14},{boat:2,course:2,score:4,avgStart:.15},{boat:3,course:3,score:5,avgStart:.14},{boat:4,course:4,score:10,avgStart:.12},{boat:5,course:1,score:3,avgStart:.16},{boat:6,course:6,score:7,avgStart:.13}];
const p=predictTwelveIndependentHypotheses(moved,{candidateMode:'rank_relative'});
assert.ok(p.upset.every(x=>moved.some(r=>r.course<moved.find(w=>w.boat===x.ticket[0]).course&&r.score>moved.find(w=>w.boat===x.ticket[0]).score)));
console.log('PASS: relative inside stronger boat loses, including shuffled entry courses');
