# 2026-11-20 — averaged win-rate scoring: verified scope and real-race gate

Research only. No deployed Boat Score or Boat Score 2 modifications.

## Offline calculation reproduced

The six-racer synthetic fixture in `scripts/test-averaged-winrate-ablation-20261120.mjs` yields:
- Original separate rankings: boats 1,2,4,3,5,6; scores 52,45,40,29,28,16.
- Separate rankings with local 0.00 replaced by national: boats 1,2,4,3,5,6; scores 50,45,38,33,28,16.
- Rank of average (national + adjusted local)/2 at 70%, motor rank 30%: boats 2,1,5,3,4,6; scores 57,46,41,33,23,10.

These are *ranking points*, not race probabilities. This fixture cannot measure prediction accuracy. The average candidate changes both the ranking method and treatment of local 0.00 compared with the original; the three-way ablation separates those effects.

## Existing captured real evidence (do not overstate)

`research/20261120-actual-morning-capture-evidence.md` documents run 44639859914: 288 requests, 203 HTTP 200, 14 `ready:true`, **0** explicit six-racer `scoreInputsByBoat` vectors. These are observed server responses, not independently authenticated before-deadline predictions. The report also documents at least one `base_stats_only` response without start, exhibition, weather or last-50 applied.

`research/20261120-saved-prediction-evidence-inventory.md` reports no tracked prediction-capture files and no independently verified finish orders joined. Therefore do not calculate a historical hit rate or assert 70/30 outperforms production.

## Required evidence to compare a real race (including Tokuyama 1R)

1. Exact race date, venue and race number, with verified official schedule and deadline.
2. Six official racer IDs and national/local/motor values captured from an identified pre-race source.
3. Makulabo 50-run values only when matched by racer ID; do not match by display name or boat color alone.
4. Original deployed forecast and its immutable capture timestamp, predictor version, and any separately verified pre-race ST/course/exhibition data.
5. Independently sourced official finish order and matching racer identities.

If any required item is missing, report `insufficient_evidence`, not a fabricated ranking, hit rate, or improved accuracy. In particular, a labelled boat/frame is not proof of actual entry course. Keep ST and course evidence separate from the 70/30 baseline until validated.

## Next actionable step

Recover a *single* independently authenticated six-racer pre-race snapshot for Tokuyama 1R (exact date must be established), then run the three-way ablation with the verified inputs. Compare to the original deployed prediction only if its original timestamped capture exists. Do not use post-race data to reconstruct prediction features.
