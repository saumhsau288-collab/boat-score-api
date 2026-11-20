# Retained morning capture inventory — 2026-11-20

Source: successful read-only GitHub Actions inventory run [44680761369](https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44680761369), commit `a7b1d58d`.

Seven retained morning-raw artifacts were read without errors. These are **raw deployed predictor API responses**, not independently authenticated pre-race forecasts.

| Capture date | Artifacts | Attempted records | HTTP 200 | ready:true | Valid 6 main + 6 upset | Ready lacking explicit six-boat scoreInputsByBoat | Ready lacking authenticated pre-race evidence |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-11-18 | 4 | 1152 | 664 | 107 | 107 | 107 | 107 |
| 2026-11-19 | 2 | 576 | 361 | 46 | 46 | 46 | 46 |
| 2026-11-20 | 1 | 288 | 203 | 14 | 14 | 14 | 14 |
| **Total** | **7** | **2016** | **1228** | **167** | **167** | **167** | **167** |

The counts include repeat capture attempts, not unique races. The raw response `ready:true` is not proof of complete six-racer features or official source verification. The missing scoreInputsByBoat counts mean the **explicit vector is absent**; do not infer the server had no internal features.

**Calibration status:** `accuracyCalculationPermitted:false`, `officialResultOverlap:null`. No official result join was made. No independently authenticated pre-race capture/cutoff evidence was established. Do not calculate hit rate, fit weights, or call these 167 verified historical predictions.

Next: obtain independently sourced official result and cutoff evidence, immutable capture timestamp/provenance, original predictor version, and six-racer input vectors, while retaining the deployed predictor identity. Keep deployed Boat Score and Boat Score 2 unchanged during research.
