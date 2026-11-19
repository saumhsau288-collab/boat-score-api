// Research-only KV write planner. No network or storage side effects.
// Storage key is namespaced away from existing morning:YYYYMMDD records.
export function planRacerEvidenceKvWrite(snapshot,{existingRecord=null}={}){
 const fail=reason=>({ready:false,reason,writeAllowed:false});
 if(snapshot?.ready!==true||snapshot?.schemaVersion!==1)return fail('invalid_snapshot_schema');
 const {date,venue,race,capturedAt,cutoffAt}=snapshot;
 if(!/^20\d{6}$/.test(String(date??''))||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return fail('invalid_race_key');
 const t=Date.parse(capturedAt??''),end=Date.parse(cutoffAt??'');
 if(!Number.isFinite(t)||!Number.isFinite(end)||t>=end)return fail('capture_not_before_cutoff');
 if(snapshot.captureStatus!=='server_timestamped_verified')return fail('trusted_server_capture_required');
 if(snapshot.source!=='official_live_entry')return fail('official_source_required');
 if(!Array.isArray(snapshot.racers)||snapshot.racers.length!==6||
  new Set(snapshot.racers.map(r=>r.boat)).size!==6||new Set(snapshot.racers.map(r=>r.racerId)).size!==6)return fail('six_racer_identities_required');
 const key=`racer-evidence:v1:${date}:${String(venue).padStart(2,'0')}:${String(race).padStart(2,'0')}:${new Date(t).toISOString()}`;
 if(existingRecord!==null)return fail('immutable_record_already_exists');
 return {ready:true,writeAllowed:true,key,value:JSON.stringify(snapshot),ttlSeconds:7776000,
  note:'Plan only. Actual storage adapter must use an atomic create-if-absent operation and trusted server-side timestamp; a read-then-write is not safe.'};
}
