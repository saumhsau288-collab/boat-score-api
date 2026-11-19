// Fail closed: a result page or a post-race API call is not a pre-race prediction snapshot.
export function validateHistoricalPreRaceSnapshot(snapshot, result){
 const issues=[];
 const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
 if(!snapshot||typeof snapshot!=='object')return {eligible:false,issues:['missing_snapshot']};
 if(snapshot.source!=='existing_Boat_Score_2_selected_race')issues.push('unknown_prediction_source');
 if(snapshot.captureKind!=='saved_before_cutoff')issues.push('not_saved_before_cutoff');
 if(snapshot.savedAt===undefined||!Number.isFinite(Date.parse(snapshot.savedAt)))issues.push('missing_capture_timestamp');
 if(snapshot.cutoffAt===undefined||!Number.isFinite(Date.parse(snapshot.cutoffAt)))issues.push('missing_cutoff_timestamp');
 if(Number.isFinite(Date.parse(snapshot.savedAt))&&Number.isFinite(Date.parse(snapshot.cutoffAt))&&
    Date.parse(snapshot.savedAt)>=Date.parse(snapshot.cutoffAt))issues.push('captured_at_or_after_cutoff');
 if(!integer(snapshot.venue,1,24)||!integer(snapshot.race,1,12)||!/^20\d{6}$/.test(String(snapshot.date??'')))issues.push('invalid_race_identity');
 if(!result||result.date!==snapshot.date||result.venue!==snapshot.venue||result.race!==snapshot.race)issues.push('result_identity_mismatch');
 if(result?.independentlyVerified!==true)issues.push('result_not_independently_verified');
 if(snapshot.inputsCapturedBeforeCutoff!==true)issues.push('prerace_inputs_unverified');
 const validPicks=a=>Array.isArray(a)&&a.length===6&&a.every(p=>Array.isArray(p)&&p.length===3&&new Set(p).size===3&&p.every(n=>integer(n,1,6)));
 if(!validPicks(snapshot.main)||!validPicks(snapshot.upset))issues.push('invalid_prediction_picks');
 return {eligible:issues.length===0,issues};
}
