# 2026-11-20 actual deployed predictor capture — bottleneck diagnosis

Source: GitHub Actions run 44639859914, artifact 14586303082, file 20261120-44639859914.json (downloaded and counted directly).

| Result | Races |
|---|---:|
| Attempted | 288 |
| HTTP 200 | 203 |
| Ready prediction | 14 |
| HTTP 200 but not ready | 189 |
| Request errors | 85 |

All 85 request errors reported `The operation was aborted due to timeout`.
All 189 non-ready responses reported `official_six_boat_stats_unverified`.

## Implications
- Main blockers are source/verification availability and request latency, **not** proven to be the scoring formula.
- 14 ready responses are not proof that their source inputs were captured before each race.
- Do not invent missing official stats or substitute post-race data.

## Next concrete work
1. Inspect source fetch and six-racer verification failures on a live **active** race, distinguishing non-running venues from true parser failures.
2. Measure source request timeouts and retries; preserve per-endpoint failure telemetry.
3. Only then fix actual parser/source issues, in a separate preview-safe change with regression tests.
4. Keep original Boat Score and published Boat Score 2 unchanged until authorized.
