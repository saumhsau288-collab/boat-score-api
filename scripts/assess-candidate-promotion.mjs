// Promotion gate for research-only trifecta candidate.
// In-sample exploratory archive cannot authorize deployment.
export function assessCandidatePromotion(report,{minimumDays=7,minimumRaces=500}={}){
 const daily=report?.daily;
 if(!Array.isArray(daily))throw Error('daily results required');
 const eligible=daily.filter(d=>d?.frameOnly?.races>0&&d?.secondFrameBoost?.races===d.frameOnly.races);
 const total=eligible.reduce((s,d)=>s+d.frameOnly.races,0);
 const candidate=eligible.reduce((s,d)=>s+d.secondFrameBoost.exact,0);
 const baseline=eligible.reduce((s,d)=>s+d.frameOnly.exact,0);
 const positiveDays=eligible.filter(d=>d.secondFrameBoost.exact>d.frameOnly.exact).length;
 const negativeDays=eligible.filter(d=>d.secondFrameBoost.exact<d.frameOnly.exact).length;
 const preRaceVerified=report?.preRaceSnapshotsVerified===true;
 const prospectivelyHeldOut=report?.prospectivelyHeldOut===true;
 const enoughDays=eligible.length>=minimumDays;
 const enoughRaces=total>=minimumRaces;
 const improvesExact=candidate>baseline;
 const stable=positiveDays>negativeDays&&negativeDays<=Math.floor(eligible.length/3);
 const promote=preRaceVerified&&prospectivelyHeldOut&&enoughDays&&enoughRaces&&improvesExact&&stable;
 return {promote,days:eligible.length,races:total,candidateExact:candidate,baselineExact:baseline,
  positiveDays,negativeDays,preRaceVerified,prospectivelyHeldOut,enoughDays,enoughRaces,improvesExact,stable,
  reason:promote?'Eligible for manual review, not automatic deployment':'Hold: prospective pre-race evidence, sample size, or stability requirements unmet'};
}
