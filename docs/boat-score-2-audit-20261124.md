# Boat Score 2 functional audit — 2026-11-24 JST

Scope: isolated preview only. Do not access or modify the Render application.
Source reviewed: worker.js build 20261124-official-timing, blob b66ce11583f90222979f1ff1327f16e7f47ed335; integration test and preview workflow.

## Findings
- Five local tabs, race-card/browser cache (120s), parallel race-card/beforeinfo acquisition, screenshot bridge and latency reporting exist in source. Latest build runtime and latency are unverified.
- Venue selector deliberately retains all 24 options; failed verification must not be interpreted as closure. Confirmed schedule filtering is unfinished.
- Race selection offers 1–12 without official confirmation; API verification remains required.
- Morning scheduled snapshot exists; no confirmed automatic deadline-minus-ten-minute refresh was found.
- Official card and selected-race analysis have separate fetch paths; shared race-scoped data management is incomplete.
- Manual screenshot counts are identity-checked reference data, not verified source counts; do not promote to automatic scores.
- Combined recent-50 calculations are experimental; wind/entry manual scenarios and baseline scores are distinct. Local win-rate zero fallback is not consistent across displayed models.
- Deadline data exists in backend but complete selector display is not verified.
- Integration test exists and is called by development workflow. Prior run 45402378586 used main workflow; no evidence of the new integration test being executed in that run.
- Prior run log shows PC official list and schedule timeouts, mobile page HTTP 200; not a verified six-racer data test.
- Prior morning snapshot log reported missing capture/order fields; do not reconstruct them retrospectively.

## Next steps
1. Run development-branch regression tests and verify deployed build.
2. Measure first and repeat card/beforeinfo latency; preserve identity and freshness checks.
3. Consolidate race data state and fix stale responses on date changes.
4. Restore verified schedule filtering and deadline display, distinguishing unavailable from closed.
5. Review inconsistent score labels and data coverage; verify actual browser behavior.

No production changes or deployment made as part of this audit. Findings are static inspection unless explicitly stated otherwise.
