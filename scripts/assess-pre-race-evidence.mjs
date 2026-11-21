// Research-only timing gate: do not turn retrospective captures into pre-race evidence.
export function assessPreRaceEvidence({snapshot,deadlineAt,independentlyAuthenticated=false}={}){
 const captured=Date.parse(snapshot?.receivedAt??snapshot?.capturedAt??'');
 const deadline=Date.parse(deadlineAt??'');
 if(!snapshot||snapshot.status!=='captured_research_inputs'||!Array.isArray(snapshot.racers)||snapshot.racers.length!==6)
  return {eligible:false,reason:'complete_six_racer_snapshot_required'};
 if(!Number.isFinite(captured)||!Number.isFinite(deadline))
  return {eligible:false,reason:'capture_and_deadline_timestamps_required'};
 if(captured>=deadline)
  return {eligible:false,reason:'capture_not_before_deadline'};
 if(independentlyAuthenticated!==true)
  return {eligible:false,reason:'independent_pre_race_authentication_required'};
 if(snapshot.preRaceIndependentlyVerified!==true)
  return {eligible:false,reason:'snapshot_pre_race_verification_required'};
 return {eligible:true,reason:'timing_gate_passed_only'};
}
