# Tokuyama 1R (2026-11-20) — retrospective base-ticket comparison

Research-only; **not** a recorded pre-deadline Boat Score 2 prediction, no production changes.

## Result corroboration
Third-party archived result pages report 1-3-2 (escape), 760 JPY/100 JPY, cutoff 08:43 JST:
- https://kyotei-karte.com/race/2026-11-20/tokuyama/1/
- https://v-select.jp/race/tokuyama/2026-11-20/1R/
Official result should still be retrieved independently for formal historical calibration.

## Input scores
Use the retrospective rank scores in research/20261120-tokuyama-1r-base-rank-comparison.md:
- separate national/local ranks 50/20 and motor 30: boat 1=49, 2=28, 3=54, 4=23, 5=22, 6=34
- averaged national/local ability rank 70 and motor 30: boat 1=54, 2=24, 3=53, 4=23, 5=22, 6=34

For each ordered distinct triple (a,b,c), strength = .56*score[a]+.29*score[b]+.15*score[c]. Rank by descending strength then lexicographic triple. Select top six as *hypothetical* main candidates.

Separate: first six 3-1-6, 3-1-2, 1-3-6, 3-1-4, 3-1-5, 3-6-1. Actual 1-3-2 ranks **7th**.
Averaged: first six 1-3-6, 3-1-6, 1-3-2, 1-3-4, 3-1-2, 1-3-5. Actual 1-3-2 ranks **3rd**.

This is a **one-race retrospective diagnostic**, not hit rate, forecast evidence, or proof that the averaged method is better. Start/course/exhibition/last-50/weather adjustments are excluded. Do not score actual race ST as pre-race information.

## Pre-race versus post-race ST
Archived race card lists *average pre-race ST*: boat 1 .17, 2 .16, 3 .15, 4 .18, 5 .00 (no reliable sample; do not interpret as fastest), 6 .12. Actual race ST: 1 .15, 2 .14, 3 .13, 4 .15, 5 .14, 6 .12. **Do not leak actual ST into forecasts.** Sources:
- https://kyotei-karte.com/race/2026-11-20/tokuyama/1/
- https://boatrace-techo.com/race/2026-11-20/tokuyama/1?tab=result

Next: independently verify official race result, capture original forecast provenance if available, and test pre-race average-ST plus verified entry course as *separate research features*, with handling for missing ST and no assumed boost for a particular boat number. Compare across multiple races before any scoring change.
