# Evidence needed before Boat Score 2 prediction-weight calibration (2026-11-20)

This is a research-only checklist, not a production deployment authorization.

| Evidence | Current finding | Calibration impact |
| --- | --- | --- |
| Archived deployed predictions | 14 saved `ready:true` responses with `rankedScores` | Descriptive ranking only |
| Official result matching | 11 of 14 race results verified; 2 unavailable, 1 cancelled | Retrospective comparisons only |
| Original six-racer inputs at scoring time | Not archived in the 14 predictions | Cannot reproduce deployed scores |
| Exact deployed preview Worker revision | Candidate source branch identified, deployed SHA not authenticated | Cannot assert formula matches archive |
| Original verified entry courses | Not present in saved prediction evidence | Do not substitute boat numbers for entry courses |
| Official pre-race ST/exhibition/conditions | Missing or unverified in saved responses | Do not impute as observed |
| まくらぼ recent-50 inputs | Missing from archived prediction evidence | No verified feature contribution |
| Official cutoff per race | Cross-page table matches, but intervals anomalous and source identity not independently authenticated | Quarantine refresh candidates |
| Cutoff-minus-10-minute candidate computation | Consistent arithmetic for 12 races | No refresh authorized |
| Independent cutoff authentication | Not implemented | Refresh gate deliberately fails closed |
| Training vs holdout split with comparable predictions | Not established | Do not adjust weights |

**Interpretation:** The 4/11 saved-top-score winners are a descriptive result, not a validated hit rate for an authenticated pre-race model. The independently coded research scorer and the candidate preview Worker use different formulas; neither can be claimed to reproduce archived deployed predictions.

**Next actionable data collection:** preserve the actual preview deployment commit and API response provenance; collect six-racer original feature vectors with source URLs and timestamps *before* cutoff; independently confirm each official cutoff; archive official results; compare untouched baseline and experimental weights on separate training and holdout races. Keep production unchanged until these conditions are met.
