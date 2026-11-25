# 2026-11-20 archived actual predictions: provenance audit (2026-11-22)

Retrieved actual GitHub Actions artifact from run https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914 (artifact ID 14586303082, `boat-score-2-morning-raw-44639859914`), inspected ZIP entries without modifying deployed apps.

- Raw capture `20261120-44639859914.json`: **288 records**, **14** responses with `ready:true` and six main plus six upset tickets each.
- Capture-level `authenticatedBeforeRace:false`. Thus **zero authenticated prospective comparisons** can currently be claimed.
- `20261120-44639859914-cutoff-candidates.json`: 14 ready with candidate times; **9 before candidate**, **5 after candidate**, **0 verified official cutoffs**, **0 calibration-eligible**. Candidate cutoff is not authoritative.
- `existing-prediction-inventory.json`: 1 capture file, 14 ready predictions, 0 with six-boat feature inputs, 0 with verified pre-race evidence.
- These historical predictions are in a GitHub Actions artifact ZIP, **not** in the research branch checkout's `prediction-captures` folder. That is why the initial checkout-only inventory printed `archiveCaptures:0`; this was not evidence that historical captures did not exist.
- Do **not** set `authenticatedBeforeRace:true` retrospectively just because a file has an early `receivedAt`; independently verify workflow trigger and official deadline identity. Do not replace unverified official cutoffs with candidates.
- Existing six main and six upset tickets are ranked **slots**, not twelve independent algorithms.
- Next: independently authenticate capture provenance and obtain independently verified official result and cutoff evidence, then run `scripts/run-eligible-saved-ticket-slots.mjs` against separate JSON evidence files. If no authenticated pairs exist, report rate `null`, not 0%.
