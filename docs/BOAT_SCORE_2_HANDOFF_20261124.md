# Boat Score 2 — chat handoff (2026-11-24)

## Resume instruction
User works on Android Chrome. When they say 「つづけて」, continue the actual research and testing, not just restate plans. Do not change the original Boat Score or deployed production worker. No paid services. Explicitly distinguish saved code, executed tests, empirical backtests, and deployment.

## User's newest prediction hypothesis
- 「評価点が同じなら内寄りを除外する」, relative inner/outer by **verified actual entry course**, NOT simply boats 1–3.
- More general upset hypothesis: a higher-scored relatively inner boat may lose to an outer boat; includes course 4 losing to 5 or 6.
- Clarify whether 「除外」 means 1st-place candidate only or all 1st/2nd/3rd positions; evaluate both rather than silently deciding.
- Keep the desired six independent favorite strategies + six independent upset strategies; the existing score-leader ticket selector is ONE formula generating six tickets, not six independent strategies.
- Do not round scores to manufacture ties. Retain national/local win-rate average handling, local 0.00 fallback, recent 50 races, motor %, ST, exhibition, wind, verified course, etc. Missing inputs are missing, not guessed.

## Current research branch
`research-outer-tie-comparison-20261124` on `saumhsau288-collab/boat-score-api`.
Files created:
- `scripts/compare-outer-tie-historical.mjs`: paired A/B comparison; old inner-first vs outer-first winner selection, six research-only tickets.
- `scripts/test-compare-outer-tie-historical.mjs`: synthetic fixture, not yet executed/verified.
- `research/20261124-outer-tie-comparison-protocol.md`: three-arm comparison and evidence requirements.
- `scripts/compare-three-tie-policies.mjs`: A baseline inner-first, B outer-first for first-place choice but inner remains eligible in 2nd/3rd, C removes inner members of exact score ties from every ticket.
- `scripts/test-compare-three-tie-policies.mjs`: synthetic fixtures; saved, not yet executed/verified.
Last commit after adding test: `63cabe3e1bb8b28a24ece117ff52d523e98644d8` (before this handoff).

## Evidence status — DO NOT OVERCLAIM
Existing `research/20261120-saved-prediction-evidence-inventory.md` reports 288 attempted captures, 203 HTTP 200, 14 ready, **zero** explicit six-racer score input vectors among ready captures. No independently authenticated pre-cutoff historical sample sufficient for tie comparison has been established. No demonstrated increase in hit rate or ROI. No production deployment.
GitHub file commits are confirmed; tests were NOT run by the assistant. The historical comparison remains pending.

## Next concrete steps
1. Execute the two synthetic tests (Node.js) on the research branch. Correct any failures, especially trifecta ordering and tie conditions. Tests only validate behavior, not prediction accuracy.
2. Review C policy's special case when fewer than 3 survivors remain; report insufficient tickets explicitly. Ensure missing or invalid dates, source provenance, pre-cutoff proof and score precision are validated.
3. Locate genuine independently saved pre-race six-boat scores + verified entry course + official result; report number of eligible races and exclusions. Do not reconstruct scores using finish results.
4. Run A/B/C on the SAME eligible races. Report denominator, number of changed predictions, winner/top-two/trifecta hits, and uncertainty; ROI only if verified odds/stakes exist.
5. Only after robust evidence, consider a separate Boat Score 2 preview. Keep original app untouched. Ask for approval if deployment would affect public app.

## URLs
Repo: https://github.com/saumhsau288-collab/boat-score-api
Branch: https://github.com/saumhsau288-collab/boat-score-api/tree/research-outer-tie-comparison-20261124
Previous checkpoint: `docs/BOAT_SCORE_2_CHECKPOINT_20261123.md`

## User-facing wording
Explain progress in Japanese, concise and precise. Never claim the code has been executed, the app updated, or historical accuracy improved unless independently verified.

## Update 2026-11-24 — external site feature research and CI
- External data-site feature review saved to `research/20261124-external-prediction-features.md`. Relevant candidate inputs: verified actual entry, relative adjacent ST/exhibition deltas, racer course win method, exhibition ST consistency, venue weather/waves. These are hypotheses only, not proven improvements.
- `scripts/relative-features.mjs` now calculates adjacent inner/outer boat ST and exhibition-time advantages from six unique verified entry courses; null when inputs are missing. `scripts/test-relative-features.mjs` provides synthetic fixtures.
- `.github/workflows/research-outer-tie-tests.yml` now includes all three synthetic suites and triggers on changes to relative feature code. Latest workflow edit commit: `5eaec4024562f2817fc541975bfc854ca284cfc0`.
- Fixed duplicate course in course-swap fixture. Three-policy comparator now counts `fullExclusion.insufficientTickets` when fewer than six tickets are generated; examples include full-exclusion-only changes.
- GitHub commits are verified. **No successful GitHub Actions run has been confirmed** and no authenticated historical comparison has been run. Earlier assistant statement of local test success should NOT be treated as proof unless logs are produced.
- Production scoring, original Boat Score, and public Worker remain unchanged.
- Next: verify CI run logs and correct failures; gather authenticated pre-cutoff six-racer scores and actual course data; evaluate additional features on held-out races without future information leakage.

## Later update — test visibility
- GitHub Actions workflow now runs `node --check` on all six comparison/feature scripts and writes a job summary clearly labeling the results as synthetic tests only. Commit `39cfc33ae461e4a27f42c23e9b78388d66ed4c65`.
- Research feature test also includes a 4th-vs-5th-course ST/exhibition advantage fixture and missing-data rejection (commit `ef7e31f36c2172465d578def8087e70f3ae7a75f`).
- CI result still not independently confirmed; commit workflow lookup returned no PR-triggered runs and cannot establish whether branch-push tests executed. Do not claim successful execution.

## Threshold audit update (2026-11-24)
- `scripts/audit-outer-challenges.mjs` now separates exact-score ties vs higher-scored inner boats (`byScoreRelation`). Synthetic test added. No empirical validation yet.
- `scripts/sweep-outer-thresholds.mjs` and `scripts/test-sweep-outer-thresholds.mjs` added. Predeclared grid ST [0, .02, .03, .04, .06] x exhibition [0, .03, .05, .07, .10] seconds. Report raw denominators and missingness; do not claim a winning threshold or select based on held-out test races.
- CI workflow includes syntax checks and synthetic fixtures for threshold grid (commit `9ae8721ea5e5d9601ef411f30198c17d5ec5a876`). No independently confirmed CI pass; original and production apps untouched.

## Independently executed synthetic checks (2026-11-24)
- Node.js v22.16.0 in local execution environment: manually reproduced the exact research-branch contents of `scripts/relative-features.mjs` and `scripts/test-relative-features.mjs`; test exited successfully.
- Also manually reproduced `scripts/audit-outer-challenges.mjs` and `scripts/test-audit-outer-challenges.mjs`; test exited successfully.
- These two checks validate code behavior on synthetic fixtures only, not live GitHub Actions and not historical prediction accuracy. Other CI tests are still unverified.
- Caveat: provenance validator only checks timestamp ordering, string model version, URL shape and flags. It does not authenticate source URLs or prove that inputs were truly collected pre-cutoff. Repeated synthetic rows sharing the same race identity are not independent historical observations.

## Race identity de-duplication update
- Added `scripts/unique-historical-races.mjs` to reject invalid YYYYMMDD dates, venues outside 1-24, race numbers outside 1-12, and **all records** sharing a normalized (date,venue,race) key.
- Integrated as mandatory preprocessing in `scripts/sweep-outer-thresholds.mjs`; report `rejectedByIdentity` separately from `rejectedByProvenance`. Updated threshold synthetic fixture to use distinct race IDs; added duplicate rejection assertions and research CI test step.
- GitHub writes completed; CI execution and historical predictive value remain unverified. Never claim a rate improvement without authenticated race-level pre-cutoff evidence.

## User-requested checkpoint — preserve development log (2026-11-24)
- User explicitly requested preserving the development log for later continuation.
- Keep original Boat Score and public Worker unchanged; all recent changes are on research branch `research-outer-tie-comparison-20261124`.
- Key logic: compare higher/equal-scored relatively inner boat against relatively outer boat by actual verified course, including 4 vs 5/6; distinguish equal-score ties from inner-higher-score upsets. Do not equate 'inner' with boats 1-3.
- Research modules: relative ST/exhibition differences, outer challenge descriptive audit, predeclared 25-threshold sweep, provenance gate, normalized race-identity duplicate exclusion. Synthetic tests exist; only previously recorded local execution of relative-features and audit tests confirmed. Newest CI pass and real historical accuracy unverified.
- Evidence gap: no authenticated pre-cutoff six-boat score dataset demonstrated; never claim improved hit rate or deployed app changes.
- Next: independently run all synthetic tests, validate source authenticity, obtain unique historical pre-cutoff rows, evaluate held-out race-level results before deciding scoring changes.

## Outer challenger finish-position audit update
- Added `flaggedOuterTopTwo`, `flaggedOuterTopThree`, corresponding unflagged counts and descriptive rates to `scripts/audit-outer-challenges.mjs`. Existing winner metrics retained.
- Updated `scripts/sweep-outer-thresholds.mjs` to output top-two/top-three rates per threshold combination; updated synthetic assertions. Research-only branch; no actual historical data evaluation or CI run confirmed for this change.
- IMPORTANT: these are pair-level candidate finish-position frequencies, not trifecta hit rates, and a candidate can appear in multiple comparisons; avoid treating them as independent races.
