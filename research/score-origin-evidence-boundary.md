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
