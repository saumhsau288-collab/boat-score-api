# Real archived capture readiness — 2026-11-18 (research only)

Source: GitHub Actions run [44269317007](https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44269317007), artifact `boat-score-2-morning-raw-44269317007`, raw file `20261118-44269317007.json`.

This is a retrospective inspection of the saved raw JSON, **not** a prediction-accuracy or calibration result.

| Check | Observed |
|---|---:|
| Attempted requests (24 venues × 12 races, not confirmed actual scheduled races) | 288 |
| Responses with `ready: true` | 28 |
| Failed or not ready | 260 |
| Ready responses received within 07:45–08:30 JST | 0 |
| Ready responses missing original six-boat feature vectors | 28 |
| Ready responses missing a six-element `rankedScores` array | 0 |
| Official race cutoff verified for tuning | 0 |

Ready response timestamps ranged from **2026-11-18 17:43:12 JST to 18:07:59 JST**. This capture must not be treated as an 08:00 pre-race sample.

Ready responses by venue number: 1=3, 2=1, 3=1, 4=5, 8=2, 11=3, 14=2, 15=2, 17=1, 18=3, 20=5. All other venue numbers had zero ready responses.

**Conclusions:** The saved predictor response contains `rankedScores`, but those are already-computed output scores and cannot be inverted into the original six-boat input features. Official pre-race cutoff and final result provenance have not been established. **No weight tuning or hit-rate claims are authorized.**

Next: verify a scheduled 08:00 JST capture and separately capture immutable, timestamped original input features plus independently sourced official results. Keep this research outside the published app.
