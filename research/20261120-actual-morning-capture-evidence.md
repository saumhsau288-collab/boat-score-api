# 2026-11-20 actual morning capture evidence (research only)

Source: GitHub Actions run https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914, artifact `boat-score-2-morning-raw-44639859914`, raw `20261120-44639859914.json`.

- Attempted 288 requests (24 venues × 12 races; **not** a verified actual-race schedule).
- HTTP 200: 203; `ready: true`: 14.
- Of the 14 ready responses, explicit `scoreInputsByBoat` six-racer feature vectors: **0**. This is absence from the response, not proof the server did not use any underlying inputs.
- Deployed predictor `method`: `weighted_national50_local20_motor30_unvalidated`. This is **not** the separate offline research scorer.
- One ready response (Toda venue 02 race 1) reports `predictionMode: base_stats_only`, `startAdjustmentApplied: false`, `exhibitionAdjustmentApplied: false`, `startCoursesVerified: false`, and `missingInputs: ['last50','course','exhibition','start','weather']`.
- Its `note` says course is observed but not scored, and wind/last50 excluded. Do not extrapolate these flags to every response without per-record inspection.
- Artifact audit `20261120-44639859914-score-inputs.json` reports `readyCompleteFiveInputs: 0`; `20261120-44639859914-response-shape.json` reports `scoreInputValuesExtracted: false`.
- The source is a saved **server-observed** response; it does not independently authenticate pre-race timing or official results. No accuracy claims or weight tuning are justified.

## Next development dependency

1. Preserve existing deployed response and original Boat Score untouched.
2. Design a separate research-only capture of original six-racer feature values with source, capture timestamp, race cutoff, racer ID, and **course versus boat number** distinguished.
3. Verify independently sourced official results and cutoffs before calibration. Do not reverse-engineer missing original features from `rankedScores`.
