import assert from 'node:assert/strict';
import {reviewHistoricalFinishOrders as review} from './review-historical-finish-orders.mjs';
const main=['1-2-3','1-3-2','2-1-3','2-3-1','3-1-2','3-2-1'];
const upset=['6-2-3','6-3-2','2-6-3','2-3-6','3-6-2','3-2-6'];
const report=review({eligibleForAccuracy:0,rows:[
 {date:'20261118',venue:1,race:3,parsedPodium:'6-2-3',mainTickets:main,upsetTickets:upset,status:'research_only_held',holdReasons:['not_authenticated']},
 {date:'20261118',venue:1,race:7,parsedPodium:null,mainTickets:main,upsetTickets:upset,status:'research_only_held'},
 {date:'20261118',venue:1,race:11,parsedPodium:'1-3-6',mainTickets:main,upsetTickets:upset,status:'research_only_held'}
]});
assert.deepEqual(report.totals,{reviewed:3,withParsedFinishOrder:2,mainExactOrderContained:0,upsetExactOrderContained:1});
assert.equal(report.rows[0].mainBestTop3BoatOverlap,2);
assert.equal(report.rows[0].upsetBestTop3BoatOverlap,3);
assert.equal(report.rows[1].mainExactOrderContained,null);
assert.equal(report.eligibleForAccuracy,0);
assert.equal(report.eligibleForScoreChange,false);
assert(!JSON.stringify(report).includes('payout'));
assert.throws(()=>review({eligibleForAccuracy:1,rows:[]}));
console.log('Finish-order-only research tests passed');
