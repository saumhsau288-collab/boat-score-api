# Direct recheck of retained deployed-predictor capture (2026-11-21)

Research only; no production code changes or accuracy claims.

Source: GitHub Actions run https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914
Artifact ID: 14586303082, name `boat-score-2-morning-raw-44639859914` (downloaded and inspected directly).
File: `20261120-44639859914.json`.

- Capture date: 2026-11-20
- Records: **288**
- Records with HTTP status 200: **203**
- Records with `response.ready === true`: **14**
- `authenticatedBeforeRace`: **false**
- Independently verified official cutoffs in retained `20261120-44639859914-cutoff-candidates.json`: **0**
- Eligible historical accuracy comparisons: **0** (not authenticated)

Ready venue/race keys: `02/1, 17/1, 17/2, 14/3, 18/3, 15/4, 21/4, 21/5, 22/5, 24/5, 09/6, 13/6, 17/6, 21/6`.

The retained cutoff-candidate diagnostic reports 9 ready responses before **candidate** cutoffs and 5 after, but explicitly reports zero **verified** cutoffs. These candidate timings must not be promoted to official cutoff evidence. The artifact does not provide authenticated pre-race prediction evidence, and no hit rate, ROI or scoring weight adjustment is justified by these counts.

Next: independently validate full official result/cutoff HTML for matching date, venue and race; preserve hashes, final URLs and timestamps, and keep any parsed results in review-only state until independent authentication.
