# Boat Score 2 — completion gate (2026-11-21)

## Verified today
- Existing deployed predictor was queried read-only; production Worker and scoring weights were not modified in this research branch.
- Saved 2026-11-20 predictor outputs: 14 records; 13 completed races joined to official results; one cancelled race excluded.
- All 78 official retrospective racer comparison rows contain national win rate, local win rate and motor two-win rate.
- Historical saved prediction inputs independently proven pre-race: **0**; pre-race average ST: **0/78**; independently verified Makulabo recent 50: **0/78**.
- Research CI includes six-racer identity, official URL and source SHA256, cutoff, Japan local calendar date and feature-provenance gates.

## Required before declaring end-to-end completion
1. **Live source evidence**: on a future active race, store six official racer identities and average ST with original response hash and capture time **before** prediction; confirm values rather than just a green workflow.
2. **Makulabo scope and identity**: obtain a permitted, reliable data source or reviewed screenshot mapping for six racers; reject ambiguous, stale, missing, or mixed-scope recent-50 data. Never label a historical HTML snapshot as independently pre-race.
3. **Original predictor input proof**: record a hash or exact signed/versioned input bundle that the existing deployed predictor actually used; merely collecting source data earlier is insufficient.
4. **Real comparison**: join saved prediction and official result, exclude cancelled races, and evaluate holdout races before any scoring-weight change.
5. **Android UI smoke test**: confirm venue filter, race selection, cutoff display, loading/error states, per-race refresh and prediction visibility in the actual preview app. A green CI run does not prove phone UI behavior.
6. **Release authorization**: keep original Boat Score untouched, preview unchanged until tested, and never merge research-only branch or deploy without explicit approval.

## Current decision
**Research validation: passing. End-to-end feature integration and production release: NOT VERIFIED.**
The 08:00 JST schedule is for future capture, not retroactive validation. Missing official ST/Makulabo/original-model-use evidence must be shown as missing; do not fabricate, silently substitute, or calibrate weights from it.
