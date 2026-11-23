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
