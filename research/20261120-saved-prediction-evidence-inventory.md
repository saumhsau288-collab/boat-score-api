# Saved prediction evidence inventory — 2026-11-20

This is a read-only research finding, not a historical accuracy evaluation.

## Confirmed sources

- GitHub main tree inspection: no tracked files under `prediction-captures/`.
- Existing morning-capture artifact: run `44639859914`, artifact `boat-score-2-morning-raw-44639859914` (ID `14586303082`), reported unexpired at inspection.
- Prior raw capture audit (`research/20261120-actual-morning-capture-evidence.md`): 288 attempted requests, 203 HTTP 200 responses, 14 `ready:true`, **zero explicit six-racer `scoreInputsByBoat` vectors**.
- These are deployed-predictor server responses, not independently authenticated pre-deadline forecasts, and not independently verified official finish orders.

## What this permits

- Inspect preserved prediction response shapes and compare source availability.
- Report capture coverage and identify which missing fields prevent calibration.

## What this does not permit

- Claim 14 independently authenticated pre-race predictions or a hit rate.
- Substitute the separate offline research scorer for the deployed predictor.
- Reconstruct missing six-racer features from rankings or retrospectively fetched results.
- Modify the existing deployed Boat Score or Boat Score 2.

## Next evidence requirement

For each race, preserve the original predictor output and version, the independently sourced official race cutoff, the immutable capture time, six racer IDs and actual/predicted entry courses separately, and independently sourced official finishing order. Exclude any record lacking the required proof from historical accuracy denominators.
