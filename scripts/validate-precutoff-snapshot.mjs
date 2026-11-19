// Research-only eligibility guard. Never treat historical page downloads as pre-cutoff captures.
export function validatePreCutoffSnapshot(snapshot){
 const errors=[];
 if(!snapshot||typeof snapshot!=='object')return {eligible:false,errors:['missing_snapshot']};
 const {date,venue,race,capturedAt,cutoffAt,source,racers}=snapshot;
 if(!/^\d{8}$/.test(String(date??'')))errors.push('invalid_date');
 if(!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)errors.push('invalid_race');
 const capture=Date.parse(capturedAt),cutoff=Date.parse(cutoffAt);
 if(!Number.isFinite(capture)||!Number.isFinite(cutoff)||!/(Z|[+-]\d\d:\d\d)$/.test(String(capturedAt))||!/(Z|[+-]\d\d:\d\d)$/.test(String(cutoffAt)))errors.push('invalid_timestamp');
 else if(capture>=cutoff)errors.push('not_before_cutoff');
 if(source!=='official_live_entry')errors.push('unverified_source');
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(r=>r?.boat)).size!==6||new Set(racers.map(r=>r?.racerId)).size!==6||racers.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||!/^\d{4}$/.test(String(r.racerId??''))))errors.push('invalid_racers');
 if(snapshot.captureProvenance!=='server_timestamped')errors.push('capture_not_proven');
 return {eligible:errors.length===0,errors};
}
