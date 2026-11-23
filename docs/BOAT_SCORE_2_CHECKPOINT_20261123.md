# Boat Score 2 — development checkpoint (2026-11-23)

## Preserve these requirements
- Keep original Boat Score and deployed production worker unchanged.
- All 24 venues / up to 12 races, only verified active venues selectable.
- Morning 08:00 JST pre-evaluation; final refresh around 10 minutes before official cutoff.
- Main 6 and upset 6 are requested as **twelve independently reasoned strategies**, not merely twelve top-ranked trifecta combinations.
- Evaluate racer ability, national/local averages, recent 50 races, motor percentage, actual course, ST, exhibition, wind/waves; never fill missing official data with guesses.
- Local win rate 0.00 is missing-data fallback to national rate, not genuine local performance.
- Compare only independently authenticated pre-race forecasts with verified official results. Separate hit rate from payout/ROI. Do not tune on evaluation data.

## Verified current code / corrections
- Research-only capture adapter, twelve-ticket audit, morning capture converter and tests are in scripts/.
- Duplicate picks across methods are allowed; uniqueTicketCount records distinct combinations. This does NOT prove independent strategies.
- Race date and timestamps checked in JST; invalid calendar dates rejected.
- Missing response fields/timestamps handled in morning capture conversion.
- Capture archives deliberately remain unauthenticated; a cutoff lookup alone does not authenticate predictions.
- CI workflow exists: .github/workflows/boat-score-2-twelve-pick-research.yml; success not verified.
- Deployed API shape is ready/main/upset for /api/predict/selected-race; current research bridge is not a deployed automation.

## Discovered conceptual issue
scripts/score-leader-favorite-upset.mjs builds all tickets using one weighted ranking formula (.56 winner, .29 second, .15 third), then slices 6 main and 6 upset. That is **one method generating twelve tickets**, not twelve distinct methods. Never report method-position hit rates as performance of twelve distinct strategies unless method provenance and distinct formulas are recorded.

## Next safe steps
1. Run the CI fixture suite and correct failures; inspect the Actions result.
2. Define and test twelve distinct, versioned strategies based on pre-race features and documented missing-data handling, without altering production.
3. Add official cutoff and result source provenance plus independently verifiable capture evidence.
4. Perform out-of-sample backtests and publish eligible sample counts, exclusions, hit rate, ROI separately.
5. Only then consider integrating into separate Boat Score 2 preview, with original app untouched.

## Status
No demonstrated improvement in hit rate, no authenticated historical accuracy estimate, no production deployment confirmed.
