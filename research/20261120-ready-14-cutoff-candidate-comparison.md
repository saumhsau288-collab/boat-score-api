# 2026-11-20 ready responses vs cutoff candidates — raw ZIP comparison

Source: GitHub Actions run 44639859914, artifact ID 14586303082. Raw files `20261120-44639859914.json` and `official-cutoff-source-evidence.json` inspected together. All 14 ready responses matched to candidate records by (venue, race).

**Diagnostic only: 9 responses received before a *candidate* cutoff; 5 received after. 0 independently verified official cutoffs.**

| Venue | Race | Received JST | Candidate cutoff JST | Difference (minutes, cutoff minus receipt) |
|---:|---:|---|---|---:|
| 02 | 1 | 08:42:52 | 10:45 | +122.1 |
| 17 | 1 | 08:44:57 | 10:16 | +91.0 |
| 17 | 2 | 08:48:25 | 10:16 | +87.6 |
| 14 | 3 | 08:51:19 | 08:35 | -16.3 |
| 18 | 3 | 08:51:49 | 08:43 | -8.8 |
| 15 | 4 | 08:54:49 | 15:19 | +384.2 |
| 21 | 4 | 08:55:42 | 08:51 | -4.7 |
| 21 | 5 | 08:59:16 | 08:51 | -8.3 |
| 22 | 5 | 08:59:15 | 10:43 | +103.7 |
| 24 | 5 | 08:59:34 | 15:16 | +376.4 |
| 09 | 6 | 09:00:38 | 10:32 | +91.4 |
| 13 | 6 | 09:01:14 | 10:34 | +92.8 |
| 17 | 6 | 09:01:55 | 10:16 | +74.1 |
| 21 | 6 | 09:01:52 | 08:51 | -10.9 |

**Potential parsing contamination:** venue 17 races 1,2,6 all have cutoff candidate 10:16; venue 21 races 4,5,6 all 08:51. A candidate may reflect a different race or page widget, rather than the requested race. These must NOT be treated as authenticated deadlines. Page identity verification in source records is false/ambiguous.

Even for the 9 candidate-before responses, the six-racer feature vector `scoreInputsByBoat` is absent and the official-result join is not authenticated. No hit-rate or scoring-weight calibration is permitted.

Next: check official per-race identity and deadline from source HTML or official structured record; then verify original six-racer inputs and result independently. Deployed Boat Score and Boat Score 2 unchanged.
