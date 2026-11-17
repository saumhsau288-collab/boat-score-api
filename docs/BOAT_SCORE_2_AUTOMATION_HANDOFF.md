# Boat Score 2: automatic offline historical research

## What runs without ChatGPT

GitHub Actions workflow `.github/workflows/boat-score-2-all-venue-methods.yml` runs at approximately **08:00 JST daily** (23:00 UTC; GitHub may delay scheduled jobs). It downloads the **seven most recently completed calendar days** of official B/K archives, joins verified results across active venues, aggregates per-racer winning methods and actual entry courses, checks sample sufficiency, and uploads dated JSON reports as GitHub Actions artifacts (90-day retention). Each daily run uses a rolling seven-day window; **these are not permanent cumulative archives**. For scheduled runs only, verified per-day JSON is additionally committed to the isolated `historical-research-data` branch, which persists beyond artifact expiry. Existing dates are never silently overwritten: a changed report for the same date fails the archive step and requires review. The archival branch contains research data only and is not a production deployment branch. This does **not** yet combine archived months into long-term racer statistics. The repository must permit GitHub Actions to write contents for this step to succeed; check the first scheduled run.\n\nHistorical runs can be triggered manually with `archive_date` and `days` (1–28). Download failures or missing archives fail the run rather than fabricating results.

## Safety and interpretation

A successful seven-day run produced 888 verified races from 958 racers and **zero** racers met the 20-start/5-win floor. Manual 28-day batches are now supported for deeper research; these do not automatically accumulate across runs. The initial three-day run produced 377 verified races from 686 racers, but **zero** racers met the 20-start/5-win minimum. This motivated widening the scheduled window; even seven days may be insufficient. Do not treat unavailable per-racer rates as zero.\n\nThis is historical **post-race analysis**, not a verified pre-race forecast or a live prediction. Official B archive capture time has not been verified as pre-start. National/local win rates are not course-specific. Individual method rates are suppressed until >=20 observed starts and >=5 observed wins; that is a reporting floor, not evidence of predictive power. No automatic code generation, score optimization, betting decisions, changes to the original Boat Score, or production deployment are authorized.

## Restart after chat limit

1. Open [GitHub Actions](https://github.com/saumhsau288-collab/boat-score-api/actions/workflows/boat-score-2-all-venue-methods.yml) and check the newest run's success/failure.
2. Inspect its `official-all-venue-racer-methods` artifact, especially `reports/all-venue-method-coverage.json` and per-day reports. Confirm data completeness before making claims.
3. Continue development on a separate branch and PR, with tests and explicit verification. Do not change production prediction weights without verified pre-race out-of-sample evidence and approval.
4. If the scheduled run does not appear, check repository Actions settings; GitHub can delay or disable scheduled workflows after inactivity.

## Pending work

- Extend archival persistence beyond 90-day artifact retention and deduplicate days before computing long-horizon racer evidence.
- Validate official archive completeness and missingness across venues and dates.
- Obtain verifiable pre-race snapshots and design leakage-free out-of-sample backtests before any prediction changes.
- Separately implement the user's intended live 08:00 daily predictions and 10-minutes-before-close refresh; this research workflow does **not** do either.
