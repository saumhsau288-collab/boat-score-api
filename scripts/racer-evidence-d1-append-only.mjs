// Research-only D1 append-only schema. Apply only to a dedicated research database.
// A unique event key rejects retries without replacing previously captured evidence.
export const RACER_EVIDENCE_D1_SCHEMA = `
CREATE TABLE IF NOT EXISTS racer_evidence_events (
 event_key TEXT PRIMARY KEY NOT NULL,
 race_date TEXT NOT NULL,
 venue INTEGER NOT NULL CHECK(venue BETWEEN 1 AND 24),
 race_number INTEGER NOT NULL CHECK(race_number BETWEEN 1 AND 12),
 captured_at TEXT NOT NULL,
 cutoff_at TEXT NOT NULL,
 payload_json TEXT NOT NULL,
 inserted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(captured_at < cutoff_at)
);
CREATE INDEX IF NOT EXISTS racer_evidence_race_lookup
 ON racer_evidence_events(race_date,venue,race_number,captured_at);
`;
export function buildRacerEvidenceD1Insert(plan){
 if(plan?.ready!==true||plan?.writeAllowed!==true||!/^racer-evidence:v1:/.test(plan.key))return {ready:false,reason:'invalid_write_plan'};
 const snapshot=JSON.parse(plan.value);
 return {ready:true,sql:'INSERT INTO racer_evidence_events (event_key,race_date,venue,race_number,captured_at,cutoff_at,payload_json) VALUES (?,?,?,?,?,?,?)',
  params:[plan.key,String(snapshot.date),snapshot.venue,snapshot.race,new Date(snapshot.capturedAt).toISOString(),new Date(snapshot.cutoffAt).toISOString(),plan.value],
  note:'Use a dedicated research D1 binding and execute with prepared.bind(...params).run(). A duplicate primary key must fail; never use INSERT OR REPLACE.'};
}
