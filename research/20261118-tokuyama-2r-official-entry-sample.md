# Official historical entry sample: 2026-11-18 Tokuyama 2R

Source: https://www.boatrace.jp/owpc/pc/race/racelist?rno=2&jcd=18&hd=20261118
Archived in GitHub Actions run 44518789985, artifact 14527595838, original HTML SHA-256 `a66037de9cae7f6c2e23f785724c8f1b4fad93ca07ec59f3876d1ab68adcab47`. Fetched 2026-11-19T11:53:36Z, **after** the race; historical pre-cutoff publication of these exact numeric values is **not authenticated**.

## Six original entry-sheet rows (transcribed from archived official HTML)

| Boat | Racer ID | Racer | National win rate | Local win rate | Historical avg ST | Motor 2-ren rate (%) |
|---:|---:|---|---:|---:|---:|---:|
| 1 | 4503 | 上野 真之介 | 7.51 | 7.70 | 0.11 | 39.72 |
| 2 | 4015 | 前野 竜一 | 5.71 | 6.77 | 0.16 | 30.88 |
| 3 | 4464 | 山下 友貴 | 6.54 | 5.74 | 0.19 | 39.84 |
| 4 | 4710 | 福田 宗平 | 5.96 | 6.15 | 0.14 | 32.59 |
| 5 | 4723 | 寺島 吉彦 | 4.61 | 4.90 | 0.17 | 38.21 |
| 6 | 4813 | 宮内 直哉 | 4.19 | 4.56 | 0.18 | 37.40 |

**This is a genuine historical official entry-sheet capture, not a pre-race snapshot.** No actual entry-course evidence or independently reviewed result is included. Boat number is not assumed to be entry course. Do not use this sample to tune weights or claim retrospective predictive accuracy until official results, actual start order, and pre-cutoff data provenance are independently established.

The six-racer entry table exists and contains the national/local win rates and average ST needed for the experimental scorer. This establishes that extraction from historical official pages is feasible, but not yet that these data can be used without hindsight bias.

## Official result matched (retrieved after race)
- Run: https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44519316225
- Artifact: 14526473543, `20261118-tokuyama-2r-result-raw.json` and `20261118-tokuyama-2r-result-parsed.json`.
- Raw official result HTML SHA-256: `655c9cb569007055a39668266566ff717785405ee61f202110424c098e827cfa`.
- Parsed six racer IDs match all six IDs in entry sheet.
- Official finish order by boat: **1,2,3,5,4,6**; podium **1-2-3**.
- Extracted actual start order by boat: **1,2,3,4,5,6**.
- Parser status: `parsed_needs_independent_review`; `racerFinishIndependentlyVerified=false`; `actualEntryCoursesVerified=false`. No eligibility for score changes until independent provenance and pre-cutoff feature values are verified.
