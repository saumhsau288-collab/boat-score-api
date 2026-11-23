# Equal-score outer-course preference — evaluation protocol (2026-11-24)

This is a research hypothesis, not a proven accuracy improvement.

## Three arms
A. Baseline: rank equal-score boats by actual entry course ascending (inner first).
B. Winner-only outer preference: rank equal-score boats by actual entry course descending when selecting first-place candidates; keep other boats eligible for 2nd/3rd.
C. Full exclusion: remove the inner equal-score boat from every ticket (must be separately evaluated; do not silently conflate with B).

The current `scripts/compare-outer-tie-historical.mjs` implements A versus B using one research-only six-ticket ranking formula; it does NOT implement C or twelve independent methods.

## Eligibility and safeguards
- Compare exactly the same race, scores and timestamp across arms.
- Require six identified boats, independently verified actual entry courses, captured pre-cutoff scores, independently verified official finishing order.
- Reject unverified capture timing, missing score vectors, incomplete course data, and post-race reconstructed scores.
- Report total eligible races, races where the tickets actually changed, winner hit rate, top-two unordered set accuracy, exact trifecta hit rate, and verified payout/ROI only when odds/stakes are available.
- Stratify by number of equal-score boats, tied courses, score gap to other boats, and whether the tied inner boat finished 1st/2nd/3rd/outside.
- Compare on held-out dates; never optimize using evaluation results.
- Score equality must use the saved score precision; do not introduce rounding to create artificial ties.
- No live deployment or production score change based on synthetic fixtures.

## Evidence status
Prior inventory reported zero explicit six-boat score input vectors among fourteen ready captures. Therefore no valid empirical improvement claim can yet be made from those captures. Synthetic regression fixtures verify code behavior only.
