# Official historical racer-course evidence plan (research only)

## Confirmed official sources

- BOAT RACE official race result page: `https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=01&hd=20261118` (result and podium candidate; independently review racer ID and actual course fields before accepting).
- BOAT RACE official daily results: `https://boatrace.jp/owpc/pc/race/resultlist?hd=20260919&jcd=03` (race-level finish order and course-level aggregates; **aggregates cannot identify each racer's actual entry course**).
- Venue-published race entry sheets (example): `https://www.boatrace-karatsu.jp/uploads/pdf/syussou/20261113_02.pdf` (registration numbers, pre-race win rates, average ST and course-entry counts; check timestamp and actual data availability before treating as pre-race evidence).

## Required record per racer per historical race

`date, venue, race, boat, racerId, actualEntryCourse, finish, sourceUrl, sourceSnapshotHash, evidenceReviewed`.

Never infer `actualEntryCourse` from `boat`. Never infer racer registration number from a name alone. Do not mark a record independently verified merely because a URL or parser output exists.

## Historical replay constraints

- Historical inputs must be from before the race cutoff; separate as-of course profiles from retrospective result data.
- The deployed predictor's current weights and exact feature mapping must be recovered before claiming its original score was reproduced.
- Compare finish order only; no payouts or return estimates.
- No automated Kyoteibiyori collection without explicit provider permission.
- Keep original Boat Score, deployed Boat Score 2, and scoring weights unchanged.

## Next executable step

Inspect an archived official `raceresult` HTML sample for six racer registration numbers and six actual entry courses; write a fixture-backed parser only for fields confirmed in that sample. Keep any parsed rows `historicalRecordVerified:false` pending independent review.
