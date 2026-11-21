import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateArchivedDailyReports} from './audit-archived-adjacency.mjs';
const race={date:'20261120',venue:1,race:1,resultVerified:true,finishOrder:[5,6,2,1,3,4]};
test('reads nested daily archive and aggregates verified races',()=>{
 const r=aggregateArchivedDailyReports([{date:'20261120',reports:[{records:[race]}]}]);
 assert.equal(r.eligible,1);assert.equal(r.archiveDays,1);
 assert.equal(r.byWinningBoat['5'].neighborPodium,1);
});
test('rejects duplicate archive days and mismatched race dates',()=>{
 const day={date:'20261120',reports:[{records:[race]}]};
 assert.throws(()=>aggregateArchivedDailyReports([day,day]),/duplicate archive date/);
 assert.throws(()=>aggregateArchivedDailyReports([{date:'20261119',reports:[{records:[race]}]}]),/race date mismatch/);
});
