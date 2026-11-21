# Historical ST/course calibration — evidence gate (2026-11-21)

Research branch only. No deployment or score-weight changes.

## Current verified facts

- GitHub Actions run 44872542444 passed tests of the historical comparison module and the independent official HTML capture fixture.
- The November 20 morning-capture audit recorded 288 attempted requests and 14 ready responses, **none** with a saved six-racer `scoreInputsByBoat` feature vector. Source: `research/20261120-actual-morning-capture-evidence.md`.
- The November 20 cutoff-source audit reported **0 authenticated official cutoffs** among 288 records. Source: `research/20261120-official-cutoff-source-288-record-audit.md`.
- Existing deployed scoring method is `weighted_national50_local20_motor30_unvalidated`, not the separate research 100-point scorer. Do not label offline comparisons as deployed-predictor performance.
- Tokuyama 2026-11-20 1R sensitivity analysis is retrospective, with no independently authenticated pre-deadline capture. It is not evidence of predictive improvement.

## Required before real calibration

1. Preserve the exact original six-racer pre-race features and their provenance, without reconstructing them from ranked scores.
2. Archive full official race-specific HTML, source URL, SHA-256, request and response timestamps; authenticate date, venue, race and labeled cutoff against the correct official page.
3. Join separately verified official finish order using the same date, venue, race, and racer identities.
4. Reject records with missing verification, capture at/after cutoff, incomplete ST/course inputs or duplicate race keys.
5. Evaluate baseline and candidate on multiple independent historical races, with holdout races kept separate from any weight selection.

**Current number of independently eligible historical comparisons demonstrated in the retained audits: 0.** This is an evidence limitation, not proof the model cannot predict.

The comparison module is an exploratory in-sample tool. Its results must not be described as holdout accuracy or used to change production scoring without additional independent validation.
