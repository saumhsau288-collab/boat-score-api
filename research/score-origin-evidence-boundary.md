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
