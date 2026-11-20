# Research evidence boundary: saved app scores vs independent scoring module

- The repository's `boat-score-2-scoring.js` explicitly states it is an independent scoring module **not wired to the production Worker**.
- The module's published `SCORE_WEIGHTS` are national win rate 45, local win rate 25, motor two-win rate 15, recent-50 win rate 10, and exhibition score 5. These describe that module only, **not proven production weights**.
- The checked `worker.js` contains no import of `boat-score-2-scoring.js` and no `rankedScores` field.
- The saved deployed-app response has `rankedScores`, but the original six-racer input vectors are absent. The origin and exact code version producing these scores remain unverified.
- Therefore: do not attribute saved score ranking differences to this module's weights; do not tune it based on the saved 11-race comparison and claim a production improvement.
- Next evidence requirement: identify the actual deployed endpoint/code revision producing `rankedScores`, archive a reproducible six-racer input snapshot with source timestamps, and only then compare controlled weight variants on separate training/holdout races.
- All retrospective analyses in this branch are exploratory. No production scoring change, merge or deployment is authorized by this document.

## Candidate implementation located (not deployed-revision authenticated)

- The scheduled capture workflow `.github/workflows/boat-score-2-capture-morning-predictions.yml` calls `https://boat-score-2-preview.saumh-sau-288.workers.dev/api/predict/selected-race` with `mode=beforeinfo`. This identifies the **capture target**, not the exact deployed revision.
- The manual preview deployment workflow `.github/workflows/boat-score-2-preview-deploy.yml` explicitly checks out `fix-boat-score-2-syntax-20261115` and deploys its `worker.js` to `boat-score-2-preview`. A later manual deployment or other revision cannot be ruled out without deployment evidence.
- The `worker.js` on that named branch contains `rankedScores` handling, start/exhibition score adjustments and trifecta ranking. It is substantially different from the research branch's `worker.js`, which does not expose `rankedScores`.
- The branch's start adjustment applies only after six verified start rows; the exhibition adjustment also requires six verified exhibition rows. This is source-code inspection, not proof either adjustment was applied to a saved response.
- Next: trace the base-score calculation within the named preview Worker, identify the exact deployment commit SHA from Cloudflare/GitHub evidence, and capture a six-racer input vector. Do not equate a matching endpoint path or branch name with verified deployed provenance.

## Candidate preview Worker base-score formula traced

In `fix-boat-score-2-syntax-20261115/worker.js`, the `/api/predict/selected-race` handler calls `buildMorningRaceInputs(date,venue,race,official)` for its base score, then conditionally applies verified exhibition and verified start adjustments.

- Six-racer `nationwide.winRate` and `motor.secondPlaceRate` are required. If all six local win rates are valid, average national and local win rates for ranking; otherwise rank national win rates alone.
- For each metric, assign rank points 6,5,4,3,2,1 with boat-number tie-breaks.
- Base score: `7 * averageWinRateRankPoints + 3 * motorTwoWinRateRankPoints`, plus optional `(nationwideTop2RankPoints + nationwideTop3RankPoints) / 100` when six racers' nationwide place rates are valid.
- `mode=beforeinfo` conditionally applies small exhibition/start timing adjustments, only with six verified rows. `rankedScores` in the response is **after** these conditional adjustments.
- The code reports `method`, `predictionMode`, `startAdjustmentApplied`, and other verification flags, but **does not return the complete original six-racer metric vector**.
- The formula is confirmed for the candidate branch source, **not yet confirmed as the exact deployed code revision that produced the archived saved scores**. Do not assume all archived records used the same adjustment state.
- Do not confuse the rank-based 70/30 candidate Worker formula with the separate unused `boat-score-2-scoring.js` 45/25/15/10/5 module.


## 2026-11-20 local-zero sensitivity and result boundary

- Research CI run 44693976730: among 14 saved-ready race comparisons, 6 races had a local win rate of 0.00. Using national win rate as fallback rather than raw 0.00 changed six-racer rank order in 5 races, and top-ranked boat in 1 race (Fukuoka 5R).
- Research CI run 44694072117: among those 5 rank-changed races, the raw-zero proxy matched the saved top-ranked boat in 5/5, while fallback matched 4/5. Exact six-boat ranking matched saved in 0/5 for raw zero and 2/5 for fallback. Agreement with saved outputs is not an outcome metric.
- Research CI run 44694871525: official finishes verified for 4/5 rank-changed races. Only Fukuoka 5R changed the top boat: raw-zero proxy favored boat 2 (finished 5th), fallback proxy favored boat 6 (finished 3rd). One retrospective case does not validate the fallback's predictive advantage.
- Research CI run 44694959754 succeeded after the reporting fix. The six zero-local races and five ranking-changed races must not be conflated.
- This discrepancy remains a **candidate implementation gap** relative to the user's intended fallback policy, not a confirmed diagnosis of the deployed preview. The candidate worker's score origin, input timestamps, and deployed SHA remain unverified.
- The official results are post-hoc, and no authorized production weights, Worker or deployment were changed.

## Archived response metadata resolves a major candidate-formula mismatch

- Research CI run 44695952749 examined all 14 saved-ready deployed responses: `method` is present in 14/14 and uniformly `weighted_national50_local20_motor30_unvalidated`; `predictionMode` is present in 14/14 and uniformly `base_stats_only`.
- `startAdjustmentApplied`, `exhibitionAdjustmentApplied`, `startCoursesVerified` and `missingInputs` fields are present in 14/14. Their actual values require the follow-up flag-count audit; presence alone does not mean an adjustment was applied.
- `sourceBranch`, `sourceCommit` and `version` top-level fields are absent in all 14/14. This is not evidence of the exact deployed SHA.
- The archived method label differs from the rank-based 70/30 candidate source method. The candidate branch code is therefore NOT authenticated as the scorer for the saved capture; previous 70/30 proxy rankings are exploratory counterfactuals, not reproductions of the actual archived scoring logic.
- The 50/20/30 proportions are reported by the saved method string, not independently verified arithmetic. Do not infer an exact formula from the label alone.

## Verified adjustment flags in saved ready responses

- Research CI run 44696732870 completed successfully and inspected 14/14 saved ready responses.
- `startAdjustmentApplied`: true 0, false 14, unknown 0.
- `exhibitionAdjustmentApplied`: true 0, false 14, unknown 0.
- `startCoursesVerified`: true 0, false 14, unknown 0.
- `predictionMode`: `base_stats_only` in all 14; `method`: `weighted_national50_local20_motor30_unvalidated` in all 14.
- Therefore the archived score outputs were unadjusted for verified exhibition/start in this capture. This does not prove the deployed app cannot apply adjustments in other races or at other capture times.
- The saved method label does not independently authenticate the underlying numeric formula. Retrospective comparisons cannot authorize changes to production weights.

## Explicit missing inputs in the 14 saved ready responses

- Research CI run 44696904545 completed successfully. All 14/14 ready saved responses contained a `missingInputs` array.
- All 14/14 listed each of `last50`, `course`, `exhibition`, `start`, and `weather` as missing.
- These are predictor-reported missing-input labels, not an independently verified root-cause diagnosis of upstream sources or data retrieval. The saved outputs must not be described as using any of these five inputs.
- Together with all 14 `base_stats_only` and all adjustment flags false, this narrows the scope of valid retrospective analysis to archived base-stat scores. It does not demonstrate failure of all app modes or times.
- Next investigation should distinguish whether the API failed to fetch data, failed to parse or validate six-racer data, or intentionally excluded unavailable/late inputs; do not fill missing values with invented measurements.

## Archived beforeinfo verification reasons (14 ready responses)

- Research CI run 44697939142 completed successfully. All 14 responses include `startVerification` and `exhibitionVerification` fields.
- `startVerification` was `six_verified_start_rows_required` in 14/14: the app did not confirm all six start rows for adjustment.
- `exhibitionVerification` was `beforeinfo_unverified` in 13/14 and `beforeinfo_http_403` in 1/14.
- HTTP 403 is a response reported by the app for one race; the remaining 13 `beforeinfo_unverified` labels do not identify whether transport, parsing, timing, or missing official data was the cause.
- These flags are archived application diagnostics, not independently authenticated root-cause analysis. No evidence that adjustments were applied to these 14 scores.

## Candidate preview parser gate inspection (source-only)

- Inspected `fix-boat-score-2-syntax-20261115/worker.js` (candidate branch, not authenticated deployed SHA). The `mode=beforeinfo` handler fetches the official `/owpc/pc/race/beforeinfo` page when no complete verified cache exists, allows up to two 9-second timeout attempts, and rejects non-OK HTTP responses or pages over 1 MB.
- `extractOfficialStartExhibition` requires a table containing `スタート展示`, parses six rows matching a strict boat/ST text pattern, and returns verified only for six unique boats. The `extractOfficialExhibition` parser requires a table with `展示タイム` and `チルト`, six rows with expected cell positions and valid exhibition time/tilt, and six unique boats.
- The handler can therefore fail at HTTP fetch, table recognition, strict row parsing, or six-boat validation; the archived `beforeinfo_unverified` label does not distinguish these. `beforeinfo_http_403` corresponds to a non-OK response in this candidate code, but its exact deployed provenance remains unverified.
- Source-only inspection does not show that any official HTML was successfully fetched for the 13 `beforeinfo_unverified` races. No post-hoc official HTML should be presented as original pre-race input.
- Safe next diagnostic: collect read-only per-stage response status, parser candidate counts, and six-boat verification with source/capture timestamps in a separately archived research probe; avoid exposing personally identifying or secret data, and do not change scoring or production.

## Timing of archived `mode=beforeinfo` capture

- Research CI run 44698264842 succeeded: 14 ready records, capture started at 08:42 JST; 10 ready responses were received during 08:00–08:59 JST and 4 during 09:00–09:59 JST.
- `scheduledTrigger:true` but `scheduledMorningWindow:false` under the collector's defined 07:45–08:30 JST window. A scheduled workflow can start later than its configured nominal schedule.
- All 14 reported `six_verified_start_rows_required`; 13 `beforeinfo_unverified` and 1 `beforeinfo_http_403`. Morning capture time is consistent with some races not yet having published exhibition/start data, but this is a hypothesis only: official publication and deadline timestamps were not authenticated.
- This capture cannot validate a separate near-deadline (10 minutes before) refresh path. Do not conclude that the near-deadline code fails from these morning observations.

## Morning schedule versus near-deadline refresh evidence

- Inspected `.github/workflows/boat-score-2-capture-morning-predictions.yml`: schedule `0 23 * * *` (08:00 JST), and the read-only collector `scripts/capture-existing-boat-score-2-predictions.mjs` requests `mode=beforeinfo` on the preview selected-race API. The collector archives raw responses and timing; this is a morning workflow, not proof of a separate near-deadline scheduler.
- The archived Nov 20 run started at 08:42 JST and did not authenticate official race cutoff times. A `mode=beforeinfo` request alone does not establish that official exhibition data was published or that a 10-minute-before-deadline refresh happened.
- Inspected the candidate `fix-boat-score-2-syntax-20261115/worker.js` source for the selected-race beforeinfo fetch and verification gates. No authenticated deployment revision or independent near-deadline run evidence was established by this inspection.
- Keep the intended 08:00 base prediction and near-deadline refresh as distinct requirements. Do not claim the latter is implemented, absent, functioning, or broken without reviewing its actual deployment and scheduler evidence.

## Important scheduler distinction: 10-minute cron is NOT 10-minutes-before-deadline

- `.github/workflows/boat-score-2-scheduled-preview.yml` is a **manual deployment workflow** (`workflow_dispatch`), which checks out `fix-boat-score-2-syntax-20261115` and generates a separate Cloudflare Worker `boat-score-2-scheduled-preview` configuration with cron `*/10 23,0,1,2 * * *` (every ten minutes during 08:00–11:59 JST). This file alone does not prove deployment or successful scheduled runs.
- Candidate Worker `worker.js` has `scheduled(event,env,ctx)` calling `runScheduledMorning(env,event.scheduledTime)`. That function uses `buildMorningRaceInputs` and `fetchOfficialRacers` for up to two venues per invocation, saves `morning:<date>` snapshots to `MORNING_KV`, and does **not** check each race's official deadline or call the selected-race `mode=beforeinfo` adjustment path.
- Therefore the candidate scheduled-preview implementation is **morning batch retry/continuation**, not an authenticated per-race ten-minutes-before-deadline refresh. A 10-minute periodic cron must never be conflated with a deadline-relative trigger.
- The preview selected-race API has an on-demand `mode=beforeinfo` fetch/verification path, but on-demand fetch does not establish automated deadline-relative invocation. Deployment status and actual scheduler executions remain unverified.
- Preserve the requirement: morning base ranking and per-race near-deadline refreshed ranking are separate snapshots, with independently captured timestamps, official deadline evidence, and six-boat input verification.
