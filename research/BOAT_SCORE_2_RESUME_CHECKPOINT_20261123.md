# Boat Score 2 — research checkpoint (2026-11-23)

## Resume here
Repository: saumhsau288-collab/boat-score-api
Research branch: research/verified-prerace-evidence-gate-20261123
Draft PR: https://github.com/saumhsau288-collab/boat-score-api/pull/250
Latest successful research CI: https://github.com/saumhsau288-collab/boat-score-api/actions/runs/45110915440

## Verified implementation state
- 12 independent prediction-method generator (six favorite, six upset) exists.
- Research-only pre-race evidence validation, saved prediction comparison, local NDJSON append/readback, SHA256 integrity checking, and test suites exist.
- Research-only old/new paired comparison and ticket-count fairness guard exist.
- Research-only morning capture audit and read-only morning ranking snapshot fetch exist.
- Research workflow CI was green at checkpoint.
- All work on research branch. Do not merge/deploy or alter original Boat Score.

## What is NOT proven
- No verified historical hit rate for the 12 methods.
- No evidence that hit rate improved over the old version.
- No authenticated complete six-racer pre-race feature history; previous audit of legacy morning responses found zero complete records.
- Read-only morning snapshot fetch was implemented and unit-tested, but not yet exercised against the live preview endpoint.
- Morning ranking records are NOT automatically 12-method prediction records.
- SHA256 checks modifications, not official data provenance, true capture timing, or forecast skill.

## Next concrete work
1. Read-only fetch an actual saved morning snapshot from preview API; record HTTP/status and completeness without fabricating data.
2. Confirm the exact field gaps between legacy morning records and six-racer evidence required for 12-method evaluation.
3. Implement an independently verifiable, pre-cutoff six-racer capture path (research-only first), with official source identity and immutable timestamp; avoid caller-supplied verification flags.
4. Save pre-race 12-method picks, later attach independently verified official finish order, and measure each method separately.
5. Compare old and new on matched races with equal ticket counts; distinguish hit rate from ROI.
6. Keep original Boat Score and deployed production untouched.

## User constraints
Android Chrome only; no paid services; 24 venues, all races; morning 08:00 JST collection and pre-deadline refresh remain product goals. Keep six favorite and six upset methods independently generated; prioritize measured accuracy and honest abstention.
