// Shared, side-effect-free eligibility rules for historical comparison.
export const validTrifectaPicks = arr => Array.isArray(arr) && arr.length===6 && arr.every(x=>Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6)) && new Set(arr.map(x=>x.join('-'))).size===6;
export const verifiedPodium = result => result?.verified===true && Array.isArray(result.finishOrder) && result.finishOrder.length===6 && new Set(result.finishOrder).size===6 && result.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6) ? result.finishOrder.slice(0,3).join('-') : null;
export const comparisonHoldReasons = (prediction,result) => [
 ...(prediction?.ready===true?[]:['prediction_not_ready']),
 ...(validTrifectaPicks(prediction?.main)?[]:['invalid_main_picks']),
 ...(validTrifectaPicks(prediction?.upset)?[]:['invalid_upset_picks']),
 ...(verifiedPodium(result)!==null?[]:['unverified_or_missing_result']),
];
