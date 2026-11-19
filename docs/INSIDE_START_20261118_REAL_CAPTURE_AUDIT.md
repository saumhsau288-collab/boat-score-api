# 2026-11-18 real capture evidence audit (research only)

Source: GitHub Actions run 44269317007, artifact `boat-score-2-morning-raw-44269317007` (artifact id 14413093032). Read directly from downloaded ZIP, not synthetic fixtures.

## Observed
- 288 attempted race captures.
- 143 network failures, 117 responses not ready, 28 ready predictions.
- 28 ready responses missing original score input evidence; 0 complete five-field six-boat input records reported.
- Official cutoff audit: 288 `official_cutoff_unverified`.
- The official cutoff source evidence file contains candidate times but no independently verified cutoffs; its source says page identity ambiguous.
- Capture timing is not authenticated as before the official race cutoff.
- No verified accuracy calculation or historical weight deployment is permitted from this artifact.

## Interpretation
The 28 ready predictions are NOT 28 eligible historical comparisons. Their source input features are missing and official cutoff times unverified. Do not use race results to backfill pre-race ST or entry course.

## Required next work
1. Capture immutable six-boat original features with per-field source and timestamp *before* cutoff; explicitly distinguish average ST, exhibition ST, and race-result ST.
2. Verify official race cutoff and page identity independently, then join official finishing order by date, venue and race.
3. Compare original deployed tickets (when captured) with experimental tickets on the same verified set, using later dates held out. An illustrative baseline proxy is NOT the deployed predictor.
4. Report excluded rows and denominators; retain production weights until sufficient independently verified evidence supports a change.

This audit does not modify deployed Boat Score or Boat Score 2.
