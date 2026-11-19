# Historical data recovery — verified observations (2026-11-19)

## Archived GitHub Actions capture
- Source: workflow run 44269317007, artifact 14413093032, `20261118-44269317007.json` and `20261118-44269317007-score-inputs.json`.
- Attempted 288 venue/race requests; HTTP successes 145; ready predictions 28.
- Captured 2026-11-18 08:42–09:13 UTC (17:42–18:13 JST), **not** at 08:00 JST.
- All 28 ready responses contain `rankedScores`, but **zero** have `scoreInputsByBoat` with original racer features. Do not invert or reconstruct scores into historical win rates or ST.
- Original input evidence: nationalWinRate 0, localWinRate 0, motorTwoWinRate 0, recent50WinRate 0, exhibitionScore 0; independently authenticated pre-race snapshots 0. No weight tuning permitted from this artifact.

## Official historical sources located
- Historical official entry sheet, 2026-11-18, Tokuyama 2R: https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261118&jcd=18&rno=2
- Historical official entry sheet, 2026-11-18, Tokuyama 5R: https://boatrace.jp/owpc/pc/race/racelist?hd=20261118&jcd=18&rno=5
- Official pre-race entry PDF archive: https://www.boatrace.jp/syussoupdf/2026/pb141118.pdf
- Official race result endpoint template: https://www.boatrace.jp/owpc/pc/race/raceresult?rno=2&jcd=18&hd=20261118

**Important:** Official pages visible today are not by themselves proof that the numerical fields were unchanged since before the historical cutoff. Archived PDF publication and source timestamps must be independently reviewed. Result-page start-order (actual entry course) must not be replaced with boat number.

## Required next data acquisition
1. Archive full six-racer historical entries from official racelist or pre-race PDF for each race, including racer registration number, national/local win rate, historical average ST and motor results, with source URL and immutable hash.
2. Archive official results and actual start-order for matching date, venue and race; preserve non-finish statuses.
3. Verify that entry features existed before that race's cutoff, and audit racer ID/boat mapping; exclude unverified cases.
4. Only then build disjoint chronological training/holdout sets and compare candidate weights. Morning 08:00 predictions are a **separate future-facing feature** and are not a historical-replay timestamp requirement.

Current conclusion: real historical source pages have been located, but **zero eligible authenticated six-racer training examples** from the inspected capture. Do not claim weight optimization or improved predictive accuracy yet.
