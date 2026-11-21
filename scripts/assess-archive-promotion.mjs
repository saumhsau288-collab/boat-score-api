// Gate research-only proposals; never automatically change app scores.
export function assessArchivePromotion({candidate,baseline,verifiedPreRaceCount=0}){
 if(!candidate||!baseline||!Number.isFinite(candidate.exactRate)||!Number.isFinite(baseline.exactRate)||!Number.isFinite(candidate.firstRate)||!Number.isFinite(baseline.firstRate)||!Number.isFinite(candidate.membershipRate)||!Number.isFinite(baseline.membershipRate))throw new TypeError('complete rates required');
 const delta={exactRate:candidate.exactRate-baseline.exactRate,firstRate:candidate.firstRate-baseline.firstRate,membershipRate:candidate.membershipRate-baseline.membershipRate};
 const beatsBaseline=delta.exactRate>0&&delta.firstRate>=0;
 const preRaceVerified=Number.isInteger(verifiedPreRaceCount)&&verifiedPreRaceCount>0;
 return {promote:false,beatsBaseline,preRaceVerified,delta,reason:!beatsBaseline?'No improvement in exact-order and first-place metrics':!preRaceVerified?'Archived win rates are not verified pre-race':'Manual prospective validation and review required',warning:'Research gate only; never deploy or modify application automatically.'};
}
