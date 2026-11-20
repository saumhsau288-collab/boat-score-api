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
