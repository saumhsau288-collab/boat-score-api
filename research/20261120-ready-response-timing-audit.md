# 2026-11-20 ready response timing audit (actual raw artifact)

Source: GitHub Actions run https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914, artifact 14586303082, file `20261120-44639859914.json`.

All times JST. These are recorded API request and receipt times, **not** independently authenticated official race cutoff times.

| Venue code | Race | Requested | Received |
|---:|---:|---:|---:|
| 02 | 1 | 08:42:35 | 08:42:52 |
| 17 | 1 | 08:44:40 | 08:44:57 |
| 17 | 2 | 08:48:08 | 08:48:25 |
| 14 | 3 | 08:51:02 | 08:51:19 |
| 18 | 3 | 08:51:32 | 08:51:49 |
| 15 | 4 | 08:54:31 | 08:54:49 |
| 21 | 4 | 08:55:25 | 08:55:42 |
| 21 | 5 | 08:58:59 | 08:59:16 |
| 22 | 5 | 08:58:59 | 08:59:15 |
| 24 | 5 | 08:59:16 | 08:59:34 |
| 09 | 6 | 09:00:21 | 09:00:38 |
| 13 | 6 | 09:00:45 | 09:01:14 |
| 17 | 6 | 09:01:37 | 09:01:55 |
| 21 | 6 | 09:01:44 | 09:01:52 |

- 14 ready responses; total 288 attempted, 203 HTTP 200.
- Capture start 08:42:35 JST, capture end 09:02:25 JST: not a complete 08:00 morning snapshot.
- All 14 ready responses lack explicit six-racer `scoreInputsByBoat` feature vectors.
- `official-cutoff-source-evidence.json` records cutoff candidates with `verified:false`; do not promote them to authenticated deadlines.
- No official-result join, no accuracy claim or score tuning. Research-only, production unchanged.
