import {compareCandidateModes} from './compare-candidate-modes.mjs';
// Controlled scenarios test sensitivity, not predictive accuracy.
const scenarios=[
 {id:'inside_ability_advantage',scores:[9,8,7,6,5,4],starts:[.12,.13,.14,.15,.16,.17]},
 {id:'outside_ability_advantage',scores:[4,5,6,7,8,9],starts:[.17,.16,.15,.14,.13,.12]},
 {id:'equal_ability_fast_inside',scores:[7,7,7,7,7,7],starts:[.11,.12,.13,.14,.15,.16]},
 {id:'equal_ability_fast_outside',scores:[7,7,7,7,7,7],starts:[.16,.15,.14,.13,.12,.11]},
 {id:'mixed_ability_start',scores:[7,9,5,8,6,7.5],starts:[.16,.14,.10,.18,.11,.13]}
];
const rows=scenarios.map(s=>{
 const racers=s.scores.map((score,i)=>({boat:i+1,score,avgStart:s.starts[i]}));
 const result=compareCandidateModes(racers);
 return {scenario:s.id,main:result.summary.main,upset:result.summary.upset,
 unrestrictedMainFirst:result.unrestricted.main.map(t=>t[0]),
 unrestrictedUpsetFirst:result.unrestricted.upset.map(t=>t[0])};
});
console.log('CANDIDATE_MODE_SCENARIO_MATRIX '+JSON.stringify(rows,null,2));
if(rows.some(r=>r.main.strategies!==6||r.upset.strategies!==6))throw Error('invalid_strategy_count');
if(rows.some(r=>r.main.changedTickets<0||r.main.changedTickets>6||r.upset.changedTickets<0||r.upset.changedTickets>6))throw Error('invalid_changed_count');
if(rows.some(r=>r.unrestrictedMainFirst.some(n=>n<1||n>6)||r.unrestrictedUpsetFirst.some(n=>n<1||n>6)))throw Error('invalid_first_candidate');
console.log('PASS: candidate mode sensitivity scenarios');
