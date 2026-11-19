# Boat Score 2: prediction snapshot storage integration plan

Status: **research design only**. No new capture schedule, KV writes, or preview deployment is enabled by this document.

## Existing deployment boundary
- The isolated preview workflow `.github/workflows/boat-score-2-preview-deploy.yml` already provisions a dedicated `MORNING_KV` binding from `BOAT_SCORE_2_KV_NAMESPACE_ID`.
- That workflow is **manual** (`workflow_dispatch`) and configures a cron of `*/5 23 * * *` (23:00 UTC, approximately 08:00 JST).
- Reuse the existing isolated preview storage rather than modifying the original Boat Score or adding another unverified production binding.
- Before implementing writes, inspect existing `worker.js` cron handler, current KV key names and values, and avoid overwriting existing morning prediction data.

## Research-only record schema
- `formatPredictionSnapshot` accepts six racer IDs, six unique trifecta picks, pre-cutoff server timestamps and explicit provenance.
- `preparePredictionSnapshotBatch` rejects duplicate `date:venue:race:phase` records.
- Offline comparison supports `morning_8am` and `precutoff_10min`, while the older `buildPreRacePredictionSnapshot` uses `morning_0800` and `pre_cutoff`. **These schemas are not interchangeable.** Implement an explicit, tested adapter before any live writes.
- The present phase classifier checks the timestamp's written clock hour, not a normalized JST hour. For live ingestion, require or normalize the capture timestamp to JST before applying morning-window rules.
- No caller-provided `captureProvenance: 'server_timestamped'` string can prove provenance by itself. A trusted Worker must stamp the capture time and preserve source evidence.

## Proposed KV keys (not active)
`research-prediction:v1:YYYYMMDD:venue:race:morning_8am`
`research-prediction:v1:YYYYMMDD:venue:race:precutoff_10min`

KV is eventually consistent; a read-then-write check alone is **not atomic**. For concurrency-safe first-write-wins semantics, use a transactional store or a single serialized writer. Never claim KV alone guarantees immutability.

## Next implementation gates
1. Inspect existing Worker scheduler and morning KV layout; identify a safe isolated namespace/prefix.
2. Implement an adapter from the actual prediction output (main six, upset six, verified racers, source and cutoff) to the research schema; fail closed if any input is missing.
3. Add trusted server capture timestamps and separate morning/near-cutoff triggers.
4. Validate in the preview environment only, with read-back and replay tests, before requesting any production change.
5. Collect genuinely eligible races; report sample sizes and holdout results before changing scoring weights.
