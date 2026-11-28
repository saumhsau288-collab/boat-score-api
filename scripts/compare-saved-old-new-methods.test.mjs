import assert from 'node:assert/strict';
import {compareSavedOldAndIndependentMethods} from './compare-saved-old-new-methods.mjs';
import {METHOD_IDS,METHOD_VERSION} from '../generate-twelve-independent-methods.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(1000+i),
 entryCourse:i+1,nationalRate:6,localRate:0,averageST:.15,motor2Rate:40,
 exhibitionTime:6.8,last50CoursePodiumRate:50}));
const evidence={date:'20261123',venue:2,race:1,capturedAt:'2026-11-23T00:00:00Z',
 officialCutoffAt:'2026-11-23T01:00:00Z',cutoffSourceVerified:true,
 captureSourceVerified:true,modelVersion:METHOD_VERSION,featureSource:'official_live_entry',racers};
const methods=Object.fromEntries(METHOD_IDS.map((id,i)=>[id,{status:'predicted',
 trifecta:i===0?[1,2,3]:[2,1,3],ruleVersion:METHOD_VERSION}]));
const row={evidence,newPrediction:{version:METHOD_VERSION,methods},
 oldPrediction:{savedBeforeCutoff:true,capturedAt:evidence.capturedAt,tickets:[[2,1,3]]},
 official:{date:'20261123',venue:2,race:1,verified:true,finishOrder:[1,2,3,4,5,6]}};
const out=compareSavedOldAndIndependentMethods([row]);
assert.equal(out.heldCount,0);
assert.equal(out.methods['favorite-1'].paired,1);
assert.equal(out.methods['favorite-1'].newOnly,1);
assert.equal(out.methods['favorite-2'].neither,1);
assert.equal(out.methods['favorite-1'].difference,1);
assert.equal(compareSavedOldAndIndependentMethods([{...row,oldPrediction:{tickets:[[2,1,3]]}}]).heldCount,1);
assert.equal(compareSavedOldAndIndependentMethods([row,row]).heldCount,1);
assert.equal(compareSavedOldAndIndependentMethods([]).methods['favorite-1'].difference,null);
console.log('Paired old/new prediction comparison tests passed');
