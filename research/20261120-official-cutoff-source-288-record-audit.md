# 2026-11-20 official cutoff source: full 288-record audit

Source: GitHub Actions run 44639859914, artifact 14586303082, file `official-cutoff-source-evidence.json`. Counts recomputed locally from all 288 raw records, not inferred from a summary.

| Item | Count |
|---|---:|
| Unique date/venue/race identities | 288 |
| HTTP 200 | 288 |
| Cutoff candidate extracted | 144 |
| Cutoff not found | 144 |
| Page identity ambiguous | 144 |
| Page identity missing | 144 |
| Official cutoff verified | **0** |
| Official HTML source consistent but not authenticated | 288 |

The raw record `htmlSample` is a beginning-of-document excerpt; its first 2000 characters do not contain a race cutoff or race-identity marker for the inspected first record. It is **not** a full source HTML archive, so a corrected page parser cannot be retrospectively validated from this excerpt alone.

**Interpretation:** HTTP 200 and trusted official domain alone do not authenticate a per-race deadline. Candidate cutoff timestamps are not fit for accuracy or weight calibration. No change to production predictor or original Boat Score.

**Next engineering task:** add a separate, read-only collector that persists full official HTML with response SHA-256, request/response timestamp, final URL, and explicit race identity + labeled cutoff extraction. Validate identity before allowing cutoff into the historical join. Respect official site access conditions and rate limits. Do not deploy this research code automatically.
