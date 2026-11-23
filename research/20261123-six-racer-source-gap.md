# Six-racer source-data gap: 2026-11-23 (research only)

## Verified archive results

Archived GitHub Actions runs 44269317007 (2026-11-18) and 44639859914 (2026-11-20) were downloaded and inspected successfully by research run 45132315778.

| Date | Attempts | HTTP 200 | Ready with 12 picks | Ready missing six-racer original inputs |
|---|---:|---:|---:|---:|
| 2026-11-18 | 288 | 145 | 28 | 28 |
| 2026-11-20 | 288 | 203 | 14 | 14 |
| Total | 576 | 348 | 42 | 42 |

All 42 ready records fail the strict six-racer input check with `six_racers_required`. This means the *captured response* lacks a six-element `scoreInputsByBoat` array. It does **not** prove that the predictor had no underlying input data.

## Source tracing

`scripts/capture-existing-boat-score-2-predictions.mjs` requests `/api/predict/selected-race` on the existing deployed `boat-score-2-preview` Worker and saves the full JSON response unmodified. It does not calculate or discard `scoreInputsByBoat`.

The repository root `worker.js` handles `/api/makulabo/heatmap` and `/api/test`, **not** the deployed `/api/predict/selected-race` route. Therefore editing `worker.js` would not repair the observed prediction-response omission. Do not change or redeploy this Worker as a supposed fix.

The separate experiment branch `experiment-racer-start-course-20261119` contains `research/boat-score-2-preview-worker.mjs` and `scripts/test-preview-prediction-worker.mjs`. Inspection confirms that this source serves `/api/predict`, **not** `/api/predict/selected-race`; its official-racelist response contains a `ranking` with per-racer original national/local rates, average ST and score breakdown, but lacks verified motor, exhibition, recent50 and entry course. The experiment branch is not proof of the source or deployment revision behind the existing `boat-score-2-preview` `/api/predict/selected-race` endpoint. Exact deployed source remains unverified; do not change the experiment Worker as if it were the missing endpoint. The existing deployed predictor reports method `weighted_national50_local20_motor30_unvalidated`; this must not be confused with offline twelve-method research.

## Safe next implementation

1. Trace the exact source and deployment workflow for the **existing** `boat-score-2-preview` prediction endpoint.
2. In an isolated research-only path, preserve six per-racer raw inputs, provenance, capture time, boat/course identity, and missing-value reasons; do not reconstruct them from `rankedScores`.
3. Keep pre-exhibition (08:00) and post-exhibition (ten minutes before cutoff) completeness requirements distinct. Never substitute zero for unavailable exhibition/start values.
4. Only after authenticated pre-cutoff snapshots and independently verified official results are joined, evaluate each of the 12 methods. Current eligible sample = **0**, so accuracy and recovery rate remain unmeasured.

No change to original Boat Score or public Worker is authorized by this investigation.
