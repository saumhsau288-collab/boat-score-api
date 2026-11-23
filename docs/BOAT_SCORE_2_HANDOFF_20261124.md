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

## Race-level flagged-challenger metrics (2026-11-24)
- `scripts/audit-outer-challenges.mjs` now tracks flagged candidate boat IDs per row and reports `flaggedRaces`, `flaggedRacesWithWinner`, `flaggedRacesWithTopTwo`, `flaggedRacesWithTopThree` and conditional rates. Pair-level metrics remain separately available.
- `scripts/sweep-outer-thresholds.mjs` exposes those race-level rates for each of 25 predeclared threshold combinations. Synthetic fixture assertions updated.
- Important: the rates are conditioned on at least one flagged candidate and do not measure full 3-number ticket hit rate. `sweep-outer-thresholds.mjs` excludes duplicate race identities first; `auditOuterChallenges` itself accepts any input rows. New code saved but CI execution remains unverified.

## Exact second/third finish position update
- Added separate exact-2nd and exact-3rd outcome counts/rates for flagged/unflagged outer challengers, plus race-level flagged 2nd and 3rd rates. Top-two/top-three cumulative metrics retained separately.
- Updated synthetic assertions and 25-threshold report. This prepares distinct evaluation for 1st vs 2nd vs 3rd candidates, but does not yet implement six independent favorite/upset prediction methods.
- Research-only GitHub commits saved; tests for this change and actual historical effectiveness not yet independently confirmed. No production deployment.

## Executed local synthetic test checkpoint
- Independently mirrored `scripts/unique-historical-races.mjs` and its test into local Node 22 runtime and executed `node test-unique-historical-races.mjs`: PASS (`Historical identity dedup synthetic assertions passed.`).
- This verifies only the duplicate/invalid race-identity fixture, not the complete CI suite, real source provenance, or prediction hit rate.
- Outstanding scope gap: outer challenge audit currently compares only **adjacent verified courses**, so a 4-vs-6 comparison is not directly represented. Do not claim full relative-outer coverage until implemented and tested.

## All relatively outer course pairs implemented (research-only)
- New `scripts/audit-all-outer-pairs.mjs` compares all 15 ordered pairs of verified actual entry courses, filtering to inner score >= outer score. Includes 4-vs-6 and other non-adjacent comparisons, distinct equal-score and inner-higher subgroups, ST/exhibition differences, and exact winner/second/third counts.
- Each flagged outer boat is deduplicated within a race for race-level rates; pair-level counts remain correlated. Added synthetic test `scripts/test-audit-all-outer-pairs.mjs` with 4-vs-6, exact first/second/third scenarios, and added it to research GitHub Actions workflow.
- Saved on research branch only; CI pass, authentic pre-cutoff data, and actual accuracy remain unverified. Input must be independently provenance-checked and race-deduplicated upstream.

## Provenance-gated all-course entrypoint
- Added `scripts/evaluate-verified-outer-pairs.mjs` that first excludes all duplicate/invalid race identities, then rejects rows failing the provenance-format gate, then calls `auditAllOuterPairs` on eligible rows only. Reports identity and provenance rejection counts separately.
- Added `scripts/test-evaluate-verified-outer-pairs.mjs` synthetic fixture for 4-vs-6, duplicates, late capture, invalid date, and CI wiring.
- Limit: provenance gate only validates parseable time strings, source URL shapes and declared flags; it does not independently verify source authenticity or actual pre-cutoff acquisition. CI run and real-world accuracy still unverified. Research branch only; no production change.

## Rechecked historical evidence artifact availability (2026-11-24)
- GitHub connector `fetch_workflow_run_artifacts` confirmed run `44639859914` still lists artifact ID `14586303082`, name `boat-score-2-morning-raw-44639859914`, `expired:false`, size `66177` bytes, created `2026-11-20T00:02:39Z`.
- This is artifact metadata verification, not inspection of the archive contents. Earlier read-only evidence inventory reported 288 attempts, 203 HTTP 200, 14 ready, zero complete explicit six-racer score input vectors. Do not promote those records to authenticated pre-cutoff accuracy evidence.
- GitHub API workflow-run list endpoint was not allowed through available fetch tool, so current CI run success remains unverified. Continue with independent capture provenance and real outcome matching, without changing production.

## Direct inspection of saved raw ZIP (2026-11-24)
- Downloaded GitHub Actions artifact `14586303082` from run `44639859914` and inspected actual `20261120-44639859914.json` inside ZIP in local container.
- Verified 288 attempted, 203 HTTP 200, 14 ready; **all 14 ready responses contain six `rankedScores` (final score/ranking values)**. This differs from `scoreInputsByBoat`: **0 of 14** have six original scoring input vectors.
- **0 of 14** have `startCoursesVerified:true`; none applied start or exhibition adjustment. No independent pre-race authentication and no independently verified race outcomes in these responses.
- Therefore **0 eligible rows** for the all-outer-pairs historical evaluation. Do not confuse final rankedScores with original feature inputs; do not claim verified historical hit rate.
- Created a local JSON inventory of the 14 ready records with capture timestamps and response hashes for further evidence matching; no production modifications.

## Direct ticket structure audit of saved 2026-11-20 ready records
- Directly parsed artifact `14586303082` ZIP JSON; 14 unique ready races, each exactly six `main` tickets and six `upset` tickets.
- In all 14, the top `rankedScores` boat equals first `main` ticket's first-place boat. All 14 report `predictionMode:base_stats_only`, missing `last50`, `course`, `exhibition`, `start`, `weather`; `startCoursesVerified:false`.
- In 2/14 races, main and upset have exactly the same set of first-place boat candidates. Ticket count alone cannot establish 12 independent prediction methods.
- Local per-race descriptive JSON generated: `/mnt/data/boat_score_20261120_ticket_structure_audit.json` (session artifact only). No accuracy or official-result claim, no production changes.

## Structural finding: archived deployed 12 tickets are not 12 independent strategies
- Inspected `scripts/audit-archived-deployed-tickets.mjs`: it documents exact replay of deployed ticket selector using `strength=score(first)*0.56+score(second)*0.29+score(third)*0.15` over all 120 ordered triples. Main = top six. Upset = highest six unused triples where **first boat number >=4**.
- This is one score-combination ranking with two selection filters, not 6+6 independently reasoned models. Boat number >=4 is not verified actual outer course; it also fails to capture relatively outer 2-vs-3 or 4-vs-5/6 relationships as general hypotheses.
- `scripts/audit-twelve-picks-research.mjs` labels ticket slots as methods, but merely enumerating slots does not establish separate generation logic.
- This is an inspection of archived replay code, not confirmation of currently deployed Worker code version. Do not claim production changed or model accuracy improved. Research branch only.

## 12 research hypotheses implemented (2026-11-24)
- Added `scripts/twelve-independent-strategies.mjs`: six differently weighted favorite strategies (score, inner course, average ST, exhibition, motor, balanced) and six distinct relative-outer upset hypotheses (score, ST, exhibition, motor, leader second, leader out of top three). One ticket per hypothesis; no duplicate tickets; can return null when qualifier absent.
- Requires six verified unique entry courses and complete score/ST/exhibition/motor fields. Uses boat ID only for identity; relative outer logic uses verified course. Synthetic Node test ran locally and passed; corresponding GitHub test and workflow added, CI run unverified.
- WARNING: Different heuristic weighting does not prove statistically independent methods or improved accuracy. Score normalization and threshold values are provisional. Real archived captures lack verified courses and cannot validate this model. No deployment or production code changes.

## Twelve-strategy diversity diagnostics
- Added `scripts/audit-twelve-strategy-diversity.mjs` and synthetic fixture; workflow now checks both. Measures distinct first-place boats, each strategy's no-pick rate, same winner and same top-two set across strategy pairs, and generated unique tickets.
- Critical distinction: 12 different formulas or unique tickets do NOT demonstrate statistical independence. Diversity metrics should be inspected before any empirical accuracy testing.
- Research-only. New fixture CI/local execution not yet confirmed; no historical accuracy claims, no production deployment.
