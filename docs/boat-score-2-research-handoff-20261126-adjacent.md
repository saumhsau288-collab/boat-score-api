# 2026-11-26 research handoff

Scope: Boat Score 2 preview only. Never modify boat-score.onrender.com. Preserve existing predictions and morning 60-race list.

## Verified archive aggregation
20261124 and 20261125 archives: 305 verified six-finisher results, boat 1 won 169 (55.4%). Conditional second counts for boats 2–6: 56,42,35,22,14; third counts: 31,43,39,33,23. Exhibition sample with numeric ST/time and boat 1 in exhibition course 1: 125. Boat 1 fastest ST: 12/30 wins vs 54/95 otherwise; fastest exhibition time: 20/37 vs 46/88; ST no slower than courses 2 and 3: 25/50 vs 41/75. Descriptive, not prospective validation.

## Research code
5678e09e added scripts/analyze-adjacent-winrate-finishes.mjs; 542070aa added second/third pair counts and result eligibility checks. Runtime testing and raw win-rate matching remain pending. Adjacent boat numbers are not actual entry courses. Local zero substitutes national. No Worker prediction changes in these commits.

## Next work
Retrieve historical official entry and result pages, match date/venue/race/boat/registration ID, verify normal finishes and refunds, distinguish actual course and boat number. Compare national/local average and local-only separately; evaluate course-specific first/second/third rates, venue effects and adjacent ST/rate gaps. Historical pages retrieved after racing are exploratory only, not authenticated pre-cutoff evidence. Validate on separate dates before any model changes.

External candidate sources mentioned in chat (not independently verified in this log): https://boatrace-db.jp/ ; https://boatrace-search.com/ ; https://www.kyoteibiyori.com/data/ ; https://databank.teimon.jp/ . Verify availability, statistics definitions, API and terms before use. No external API ingestion completed.
