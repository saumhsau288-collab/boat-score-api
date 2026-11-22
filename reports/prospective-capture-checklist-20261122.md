# Research-only prospective collection gate

## Current status
The immutable `historical-research-data` branch contains daily files through 20261121 only (confirmed in Actions). Do not manufacture a 20261122 report or treat an empty day as a failed prediction.

## Data collection protocol
1. Before each race, capture the actual official entry table, racer national/local rates, average ST, motor two-place rate, exhibition time, expected entry course, wind/waves, and timestamps, marking unknown fields null.
2. Keep original source URL and capture timestamp. Confirm capturedAt is before scheduledStartAt. Verify the source independently; a successful parser is not proof of source authenticity.
3. Save a unique prediction record keyed by `YYYYMMDD-venue-race` **before** the race starts, with the frozen rule version, training dates, predicted first boat and exact trifecta. Never overwrite this record after the result.
4. After official result publication, independently join the six-boat finish order to the previously frozen prediction using date, venue, and race. Reject duplicate keys, missing race IDs, unverified results, and post-start captures.
5. Only then compute prospective first-place and exact-trifecta accuracy; report exclusions and missing-data coverage alongside rates.

## Existing validation code
- `scripts/build-prospective-race-record.mjs` structures timestamped pre-race fields.
- `scripts/prepare-strict-prospective-snapshot.mjs` checks the input format and timing.
- `scripts/assess-prospective-admission.mjs` requires separate source-verification evidence.
- `scripts/evaluate-position-model-holdout.mjs` freezes 20261112–20261117 model training; its post-20261121 archive group is **retrospective** unless the above live-capture evidence is available.

## Promotion gate
No live prediction is yet demonstrated from the current immutable historical archive. Do not change the public app, report prospective accuracy, or imply profitability until complete independent evidence exists. Never train on outcome data from the same race being evaluated.
