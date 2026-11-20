# 2026-11-20 raw artifact inspection — actual file evidence

Source: GitHub Actions run https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914
Artifact ID 14586303082, `boat-score-2-morning-raw-44639859914`, file `20261120-44639859914.json`.

The original ZIP was downloaded and its raw JSON inspected locally (not merely the earlier summary). Findings:
- 288 attempted records, 203 HTTP 200, 14 `response.ready === true`.
- All 14 ready responses lack an explicit `scoreInputsByBoat` field.
- Tokuyama 1R (venue 18, race 1) record:
  - `requestedAt: 2026-11-19T23:44:53.258Z` = 08:44:53 JST
  - `receivedAt: 2026-11-19T23:45:23.259Z` = 08:45:23 JST
  - `error: The operation was aborted due to timeout`
  - No `response.ready`, no recorded prediction.
- Earlier research noted official *scheduled* cutoff 08:43 JST. This capture attempt began after the scheduled cutoff and failed. Do not call the retrospective hypothetical 1-3-2 ticket a deployed prediction.
- Existing artifact `20261120-44639859914-cutoff-audit.json` reports all 288 official cutoffs unverified within that artifact; `cutoff-candidates.json` counts 14 ready, 9 before candidate and 5 after candidate, but **zero verified cutoffs**. These are candidate diagnostics only.
- A local Node.js test of the strict eligibility gate passed all six *synthetic* cases. This does not authenticate any actual historical race.
- **Authenticated accuracy-calibration sample remains unestablished**. Do not claim 133 raw unique ready keys are validated.
- Original Boat Score and deployed Boat Score 2 remain unchanged.
