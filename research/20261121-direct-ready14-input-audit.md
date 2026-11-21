# 2026-11-20 deployed predictor: 14 ready responses input audit

Research only. Directly inspected ZIP artifact 14586303082 (`boat-score-2-morning-raw-44639859914`) from [run 44639859914](https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914), JSON `20261120-44639859914.json`.

There are 288 API attempts, 203 HTTP 200 responses and 14 ready responses. The original `authenticatedBeforeRace` is **false**. None of the 14 is eligible for verified historical accuracy or tuning until independent official cutoff and outcome authentication.

The first ready response (venue 02, race 1) contains six `rankedScores` entries and six `main` plus six `upset` trifecta tickets. Its predictor reports `method: weighted_national50_local20_motor30_unvalidated`, `predictionMode: base_stats_only`, `startAdjustmentApplied: false`, `exhibitionAdjustmentApplied: false`, and `missingInputs: ['last50','course','exhibition','start','weather']`. This is a per-record observation, not evidence that every ready record shares the same flags.

The first ready response was received at 2026-11-19T23:42:52.608Z (2026-11-20 08:42:52.608 JST). The last received ready response was 2026-11-20T00:01:52.967Z (09:01:52.967 JST). These are server-observed capture times, not verified official race cutoffs. The morning batch was not necessarily completed at 08:00.

A response-level `responseSha256` is present; this alone does not authenticate its time relative to the race cutoff or verify official finish order.

**Do not** replace the deployed predictor's 50/20/30 method with the separate research-only morning scoring weights when evaluating these saved picks. Compare exactly the saved `main` and `upset` arrays only after all eligibility checks pass.
