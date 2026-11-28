import assert from 'node:assert/strict';
import {METHOD_IDS,METHOD_VERSION} from '../generate-twelve-independent-methods.mjs';
import {evaluateSavedIndependentMethods} from './evaluate-saved-independent-methods.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 entryCourse:i+1,nationalRate:6,localRate:0,averageST:.15,motor2Rate:40,
 exhibitionTime:6.8,last50CoursePodiumRate:50}));
const evidence={date:'20261123',venue:2,race:1,capturedAt:'2026-11-23T00:00:00Z',
 officialCutoffAt:'2026-11-23T01:00:00Z',cutoffSourceVerified:true,
 captureSourceVerified:true,modelVersion:METHOD_VERSION,featureSource:'official_live_entry',racers};
const methods=Object.fromEntries(METHOD_IDS.map((id,i)=>[id,{status:i===1?'abstain':'predicted',
 trifecta:i===0?[1,2,3]:[2,1,3],ruleVersion:METHOD_VERSION}]));
const row={evidence,prediction:{version:METHOD_VERSION,methods},
 official:{date:'20261123',venue:2,race:1,verified:true,finishOrder:[1,2,3,4,5,6]}};
const summary=evaluateSavedIndependentMethods([row]);
assert.equal(summary.heldCount,0);
assert.equal(summary.methods['favorite-1'].hitRate,1);
assert.equal(summary.methods['favorite-2'].hitRate,null);
assert.equal(summary.methods['favorite-2'].abstained,1);
assert.equal(summary.methods['favorite-3'].hitRate,0);
assert.equal(evaluateSavedIndependentMethods([row,{...row}]).heldCount,1);
assert.equal(evaluateSavedIndependentMethods([{...row,official:{...row.official,verified:false}}]).heldCount,1);
assert.equal(evaluateSavedIndependentMethods([{...row,evidence:{...evidence,capturedAt:evidence.officialCutoffAt}}]).heldCount,1);
console.log('12-method saved evidence evaluation and abstention tests passed');
