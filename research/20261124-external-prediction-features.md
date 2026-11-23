# External boat-racing data-site research — 2026-11-24

Research only; third-party methods are not validated predictive gains. Do not scrape member-only pages or copy proprietary algorithms. Use official licensed/public source data when available.

## Observed site features and possible Boat Score 2 experiments
1. https://kyoteibiyori.com/ : alerts for exhibition time advantage vs inner boats (0.07–0.10s options), mean ST gaps (0.07/0.10/0.14s options), entry changes, tilt; test relative ST/exhibition deltas, not arbitrary boosts.
2. https://makulabo-jp.com/ : 10/30/50 recent runs, 1st/2nd/3rd finish rate, vulnerable inside and 4th-course candidates. Some features member-gated; do not assume accessible.
3. https://boatec.jp/ : wind x waves, tides, venue x actual course, race time, ST bands, F history, winning method. Stratify historical comparisons by these features.
4. https://1markboat.jp/ : start formation (fast/slow adjacent boats), 1st-turn scenarios, course-specific winning methods. Test relative neighbor ability rather than solely absolute boat score.
5. https://kyotei-japan.com/ : actual entry course rather than boat number, venue-specific course rates.
6. https://kyoteibiyori.com/vup/ : exhibition-vs-race ST consistency; exhibition ST reliability should be estimated from PREVIOUS races only.

## Proposed new derived features (NOT implemented)
- adjacent_inner_ST_gap and adjacent_outer_ST_gap from verified actual entry course, not boat numbers
- exhibition_time_advantage_over_inner, relative to same-race boats
- racer_course_specific_win_rate and method-of-win distribution with sample-size shrinkage
- exhibition_ST_reliability computed only on historical pre-race-available starts
- venue/course/wind/wave interaction; avoid future leakage

## Evaluation
Compare baseline versus adding one feature at a time on authenticated held-out historical races; report sample counts, missingness, hit rates, calibration, and whether predictions actually change. Never claim improved hit rate from other sites' feature lists alone. Existing six-ticket selector is not six independent strategies. Preserve original app and production worker.

## Sources accessed
https://kyoteibiyori.com/
https://kyoteibiyori.com/vup/
https://makulabo-jp.com/
https://boatec.jp/
https://1markboat.jp/
https://kyotei-japan.com/
https://boat-lab.site/
