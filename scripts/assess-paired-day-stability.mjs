// Conservative research gate: do not promote a variant that wins only on aggregate.
export function assessPairedDayStability(report){
 const days=report?.byDay,paired=report?.paired;
 if(!Array.isArray(days)||!days.length||!paired)throw Error('invalid paired report');
 const totals=days.reduce((a,d)=>{for(const k of ['races','baselineExact','candidateExact','baselineOnly','candidateOnly','both','neither']){if(!Number.isInteger(d[k])||d[k]<0)throw Error('invalid count');a[k]=(a[k]||0)+d[k];}if(d.baselineExact!==d.baselineOnly+d.both||d.candidateExact!==d.candidateOnly+d.both||d.races!==d.baselineOnly+d.candidateOnly+d.both+d.neither)throw Error('inconsistent daily counts');return a;},{});
 if(totals.baselineOnly!==paired.baselineOnly||totals.candidateOnly!==paired.candidateOnly||totals.both!==paired.both||totals.neither!==paired.neither||paired.netCandidateGain!==totals.candidateOnly-totals.baselineOnly)throw Error('inconsistent paired totals');
 const improvedDays=days.filter(d=>d.candidateExact>d.baselineExact).length;
 const worsenedDays=days.filter(d=>d.candidateExact<d.baselineExact).length;
 const tiedDays=days.length-improvedDays-worsenedDays;
 const net=totals.candidateExact-totals.baselineExact;
 return {holdoutDays:days.length,holdoutRaces:totals.races,baselineExact:totals.baselineExact,candidateExact:totals.candidateExact,net,improvedDays,worsenedDays,tiedDays,promote:false,reason:net<=0?'no_aggregate_gain':worsenedDays>0?'day_instability':'unverified_pre_race_inputs',warning:'Research-only conservative gate; archived inputs lack authenticated pre-race provenance, so never auto-promote.'};
}
