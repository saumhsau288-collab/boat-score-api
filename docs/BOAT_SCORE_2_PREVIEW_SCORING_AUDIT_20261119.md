# Boat Score 2 — scoring source-of-truth audit (2026-11-19)

## Scope and evidence

Inspected the repository `main` deployment workflows and the explicit preview deployment source `fix-boat-score-2-syntax-20261115:worker.js`. This is a **source-code audit**, not proof of the currently running Cloudflare build; verify `/api/version` and deployed artifact before claiming runtime equivalence.

- `.github/workflows/boat-score-2-preview-deploy.yml` checks out `fix-boat-score-2-syntax-20261115` and deploys its `worker.js` to `boat-score-2-preview`.
- `.github/workflows/boat-score-2-scheduled-preview.yml` also checks out that branch, deploying a distinct scheduled-preview Worker.
- The `main:worker.js` is a different, much smaller file and must **not** be substituted for the preview implementation.
- `main:boat-score-2-scoring.js` explicitly says it is an independent module **not wired to production Worker**; its weights 45/25/15/10/5 do not establish deployed scoring weights.

## Preview Worker — actual selected-race path

In `fix-boat-score-2-syntax-20261115:worker.js`:

1. `buildMorningRaceInputs` (around lines 2415–2446) requires six verified official racer stats. It ranks six boats 6..1 separately by national win rate, local win rate, and motor second-place rate. When all local rates are available, scores use **5 × national rank + 2 × local rank + 3 × motor rank**; otherwise **7 × national rank + 3 × motor rank**. Verified national top2/top3 rank tie-breaks add at most 0.12 in total. These are rank-score coefficients, **not** percentage probabilities.
2. `applyVerifiedExhibitionAdjustment` (around 2500–2515) adds `(exhibition rank − 3.5) × 0.6` only when all six exhibition times are verified.
3. `applyVerifiedStartAdjustment` (around 2521–2552) adds `(start rank − 3.5) × 0.3` only with six verified start/course rows and valid timing or verified average-ST substitution. Actual entry course is observed but **not scored**.
4. `rankTrifectaCandidates` (around 2555–2570) ranks 120 ordered distinct-boat trifectas by `0.56 × first score + 0.29 × second score + 0.15 × third score`. **Existing main** is top six combinations across all first boats; **existing upset** is top six unused combinations with **first boat number ≥4**. It does **not** require the highest-scored boat to win in main, nor to lose in upset.
5. `/api/predict/selected-race` returns `rankedScores`, `main`, `upset`, `basePrediction`, `predictionMode`, `exhibitionAdjustmentApplied`, `startAdjustmentApplied`, and `missingInputs`. Its note explicitly says wind and last50 are excluded from server prediction scoring. The screenshot-based last50 review is described as unverified and not applied to prediction points.

## Important distinctions and blockers

- `main:scripts/score-leader-favorite-upset.mjs` is a **separate offline research model**. Its main six always fix the highest-scored boat first; its upset six split 3 leader second/third and 3 leader outside podium. This is the user's newer desired ticket grouping, **not the existing preview Worker grouping**.
- Replaying archived final `rankedScores` can reproduce the **ticket selector** but cannot reconstruct historical raw score inputs, model provenance, verified pre-race timing, or a true historical hit rate.
- The preview deployment workflow is **manual**; the scheduled-preview workflow is also manual deployment with cron triggers. A separate research workflow scheduled at 08:00 JST is **not proof** that all public preview race predictions are ready at 08:00 JST.
- Avoid modifying the original Boat Score, existing preview Worker, live score weights, or claiming accuracy from retrospective captures.

## Next steps

1. Verify deployed `/api/version` and a fresh read-only `/api/predict/selected-race` response against the audited branch; record source hash/build identifier and date/time.
2. Keep existing preview predictions and the new score-leader 6+6 method as **separate named outputs** during offline comparisons.
3. Acquire authentic historical pre-cutoff score snapshots plus independently checked official podiums. Never substitute post-race score recomputation.
4. Evaluate changes on held-out dates, then seek explicit approval before preview deployment or weight modifications.
