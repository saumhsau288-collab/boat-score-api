import assert from 'node:assert/strict';
import {predictTwelveIndependentHypotheses} from './predict-twelve-independent-hypotheses.mjs';
const scenarios=[
 {id:'inside',scores:[9,8,7,6,5,4],starts:[.12,.13,.14,.15,.16,.17]},
 {id:'outside',scores:[4,5,6,7,8,9],starts:[.17,.16,.15,.14,.13,.12]},
 {id:'equal',scores:[7,7,7,7,7,7],starts:[.11,.12,.13,.14,.15,.16]},
 {id:'mixed',scores:[7,9,5,8,6,7.5],starts:[.16,.14,.10,.18,.11,.13]}
];
const rows=scenarios.map(({id,scores,starts})=>{
 const racers=scores.map((score,i)=>({boat:i+1,score,avgStart:starts[i]}));
 const topScore=Math.max(...racers.filter(r=>r.boat<=3).map(r=>r.score));
 const topBoats=racers.filter(r=>r.boat<=3&&Math.abs(r.score-topScore)<=1e-9).map(r=>r.boat);
 const top=topBoats.length===1?topBoats[0]:null;
 const p=predictTwelveIndependentHypotheses(racers,{candidateMode:'rank_relative'});
 const unrestricted=predictTwelveIndependentHypotheses(racers,{candidateMode:'unrestricted'});
 assert.equal(p.distinctTickets,12);
 assert.equal(p.main.length,6);
 assert.equal(p.upset.length,6);
 assert.ok(p.upset.every(x=>!topBoats.includes(x.ticket[0])));
 assert.deepEqual(predictTwelveIndependentHypotheses([...racers].reverse(),{candidateMode:'rank_relative'}),p);
 return {scenario:id,topAbilityBoat:top,tiedTopBoats:topBoats,mainFirst:p.main.map(x=>x.ticket[0]),upsetFirst:p.upset.map(x=>x.ticket[0]),changedFromUnrestricted:[...p.main,...p.upset].filter((x,i)=>x.ticket.join('-')!==[...unrestricted.main,...unrestricted.upset][i].ticket.join('-')).length};
});
const tiedLeaders=[9,9,7,6,5,4].map((score,i)=>({boat:i+1,score,avgStart:.12+i*.01}));
const tiedResult=predictTwelveIndependentHypotheses(tiedLeaders,{candidateMode:'rank_relative'});
assert.ok(tiedResult.upset.every(x=>![1,2].includes(x.ticket[0])));
assert.equal(tiedResult.distinctTickets,12);
console.log('RANK_RELATIVE_SCENARIOS '+JSON.stringify(rows,null,2));
console.log('PASS: rank-relative research mode excludes top ability boat from upset first');
