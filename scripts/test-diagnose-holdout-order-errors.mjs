import assert from 'node:assert/strict';
import {diagnoseHoldoutOrderErrors} from './diagnose-holdout-order-errors.mjs';
const record=(order)=>({resultVerified:true,finishOrder:[...order,...[1,2,3,4,5,6].filter(n=>!order.includes(n))],racers:[1,2,3,4,5,6].map(boat=>({boat,nationalWinRate:5}))});
const day=(date,orders)=>({date,reports:[{records:orders.map(record)}]});
const reports=[day('20261112',[[1,2,3]]),day('20261113',[[1,2,3]]),day('20261114',[[1,2,3],[1,3,2],[2,1,3],[1,2,4],[4,5,6]])];
const result=diagnoseHoldoutOrderErrors(reports,{podiumWeight:1,orderWeight:2});
for(const key of ['frameOnly','twoStage']){
 const s=result[key];
 assert.equal(s.races,5);
 assert.deepEqual({exact:s.exact,wrongWinner:s.wrongWinner,rightWinnerWrongPodium:s.rightWinnerWrongPodium,rightPodiumWrongWinner:s.rightPodiumWrongWinner,rightPodiumWrongSecondThird:s.rightPodiumWrongSecondThird}, {exact:1,wrongWinner:1,rightWinnerWrongPodium:1,rightPodiumWrongWinner:1,rightPodiumWrongSecondThird:1});
 assert.equal(s.exact+s.wrongWinner+s.rightWinnerWrongPodium+s.rightPodiumWrongWinner+s.rightPodiumWrongSecondThird+s.rightWinnerRightPodiumWrongOrder+s.other,s.races);
}
assert.deepEqual(result.holdoutDates,['20261114']);
console.log('Holdout order error decomposition tests passed');
