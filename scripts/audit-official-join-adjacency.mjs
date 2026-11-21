// Official B/K joined results -> descriptive adjacency counts, no pre-race claim.
import {auditAdjacentAgainstChance} from './audit-adjacent-baseline.mjs';
export function auditOfficialJoinAdjacency(data) {
 const records=Array.isArray(data)?data:data?.records;
 if(!Array.isArray(records))throw new TypeError('expected records array');
 const report=auditAdjacentAgainstChance(records);
 return {...report,inputCount:records.length,source:'official B/K verified finish order',
  pointInTimeVerified:records.filter(r=>r?.resultVerified===true&&r?.asOfVerified===true&&r?.capturedBeforeStart===true).length,
  warning:'Descriptive historical finish-order patterns only. B/K pre-race snapshot timestamps are not verified by default. No prediction, causal claim, or score tuning.'};
}
