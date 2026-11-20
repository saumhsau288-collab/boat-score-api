# Research evidence boundary: saved app scores vs independent scoring module

- The repository's `boat-score-2-scoring.js` explicitly states it is an independent scoring module **not wired to the production Worker**.
- The module's published `SCORE_WEIGHTS` are national win rate 45, local win rate 25, motor two-win rate 15, recent-50 win rate 10, and exhibition score 5. These describe that module only, **not proven production weights**.
- The checked `worker.js` contains no import of `boat-score-2-scoring.js` and no `rankedScores` field.
- The saved deployed-app response has `rankedScores`, but the original six-racer input vectors are absent. The origin and exact code version producing these scores remain unverified.
- Therefore: do not attribute saved score ranking differences to this module's weights; do not tune it based on the saved 11-race comparison and claim a production improvement.
- Next evidence requirement: identify the actual deployed endpoint/code revision producing `rankedScores`, archive a reproducible six-racer input snapshot with source timestamps, and only then compare controlled weight variants on separate training/holdout races.
- All retrospective analyses in this branch are exploratory. No production scoring change, merge or deployment is authorized by this document.
