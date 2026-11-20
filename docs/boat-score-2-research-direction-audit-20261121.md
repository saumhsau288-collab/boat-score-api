# Boat Score 2 — research direction audit (2026-11-21)

## Primary prediction target
Identify the most likely *racer* to finish 1st, then construct 2nd/3rd candidates around that predicted winner. Boat number is a race-day condition, never the identity being evaluated. First-place prediction accuracy is the primary research metric; top-rated racer podium hit rate and three-racer podium precision must not regress.

## Existing baseline (preserve for reproducibility)
National win rate 45, local win rate 25, motor 2-win rate 15, recent 50 10, exhibition score 5. National/local are official 0–10 win-rate values, **not** observed podium percentages. Local 0.00 uses national as fallback. Current baseline has no explicit ST, course or venue interaction weights. Do not call it a fully realized racer podium probability.

## Data lineage and chronological integrity
1. Identify venue, date, race, scheduled cutoff, racer registration number, and actual entry course for all six starters.
2. Preserve pre-cutoff national/local racer win rate, pre-cutoff racer top-three history (with denominators), recent 50 sample scope, ST history, motor record, and weather/exhibition where available. Missing is missing, not zero.
3. Preserve score and capture receipt with timestamp *before* the cutoff.
4. Capture official six-racer result and cross-check identity, source hash, and finish rank.
5. Keep results from the same or later race out of historical features. Split training and holdout chronologically by date.
6. Do not promote a source flag alone into independent authentication.

## Venue-specific research
Aggregate historical podium finishes by racer registration number **and venue**, with sample sizes. Analyze course, entry, ST, wind, wave and motor as contextual features. Shrink sparse venue-racer rates toward the racer-wide rate; do not assume venue-specific superiority from a few starts. Measure improvement separately per venue and globally on held-out days. Do not conflate boat-frame effects with individual racer performance.

## Immediate priorities
P0: Get real official result HTML and confirm six-racer parser; collect multiple completed races, not one.
P0: Establish verified pre-cutoff feature/score pairs; a post-race snapshot cannot reconstruct a legitimate prior prediction.
P1: Add per-racer top-three history, start-timing and venue-racer sample-size features, with source provenance and missing-value gates.
P1: Research-only chronological first-place accuracy comparisons; require non-regression in second/third candidate podium precision.
P2: Test venue-specific shrinkage and course/ST/weather effects with enough independent history.
P3: Only after verified out-of-sample improvement, propose weights for explicit review; do not auto-change production.

## Current limitations
The historical evidence gate currently has no independently verified complete pre-cutoff six-racer score/result joins. Venue/racer descriptive reports and synthetic tests do not demonstrate real predictive improvement. Production app and baseline weights remain unchanged.
