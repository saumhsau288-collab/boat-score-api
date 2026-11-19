# Racer scoring experiment — verified data gap review (2026-11-19)

## Evidence reviewed
- Existing repository report `research/20261118-capture-readiness.md` cites Actions run 44269317007 and raw artifact.
- 288 attempted venue/race requests (not 288 verified scheduled races); 28 ready responses.
- Zero ready responses in the 07:45–08:30 JST morning window.
- All 28 ready responses lack the original six-boat feature vectors needed to recompute model scores.
- Official cutoff and independently verified final-result provenance were not established for any of those records.
- Ready timestamps were 17:43:12–18:07:59 JST, so they are not authenticated morning forecasts.

## Consequence
These 28 records must not be used to claim prediction accuracy, tune weights, or compare the old and experimental racer score models. The exploratory four-race comparison in Actions run 44509339459 is also ineligible for calibration: its input statistics were retrieved after races and results were not independently verified.

## Minimum next evidence
1. Persist a timestamped immutable pre-race six-boat feature vector including national/local win rates, historical average ST, verified actual entry course if available, motor/recent50/exhibition components, and missingness indicators.
2. Record the race identity, official cutoff, capture timestamp, source URL and verification status separately from the computed rankings.
3. Join independently verified official finish order without overwriting original input snapshots.
4. Evaluate chronological later-date holdout; publish excluded-reason counts and sample sizes.
5. Only then consider changing production scoring; never deploy directly from this experimental branch.

This is a read-only evidence audit, not a claim that new data were captured or that historical accuracy improved.
