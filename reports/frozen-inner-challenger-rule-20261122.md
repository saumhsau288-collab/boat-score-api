# Frozen exploratory challenger rule (2026-11-22)

Research only. Do not deploy to Boat Score or Boat Score 2.

## Locked rule
- Score = arithmetic mean of national and local win rates; if local is missing or 0.00, substitute national while recording missingness.
- Rank all six boats by score; exclude ties from this audit.
- When boat 1 ranks 4th–6th, the highest-rated non-1 boat is boat 2, 3 or 4, and its score exceeds boat 1 by at least 2.00, force that boat into first place.
- Choose second and third by maximizing the existing position-model product among distinct remaining boats. Otherwise use the unchanged position-model trifecta.
- Train the position-model counts only on 2026-11-12 through 2026-11-17. Freeze all thresholds and training data for the next evaluation.

## Previously inspected data: NOT an independent test
- 2026-11-18 through 2026-11-21: 430 eligible races, 50 rule switches.
- Original model 40/430 exact trifectas; hybrid 44/430. Original first-place 227/430; hybrid 240/430.
- Rule was discovered and refined by looking at these dates. Treat this as exploratory/in-sample rule selection, NOT prospective performance.

## Future independent check
- Evaluate the locked rule on newly collected, previously unseen dates starting 2026-11-22, **without changing any thresholds or training counts**.
- Do not mix any newly observed outcomes into training before recording predictions.
- Report eligible and excluded races, rule switches, first-place accuracy, exact trifectas, daily results, paired gains/losses against the unchanged model, and fixed 1-2-3 baseline.
- Require verifiable timestamped pre-race national/local rates, actual entry course, and official result matching before calling the results prospective. If missing, label the study retrospective and keep the promotion gate closed.
- Do not promote on an apparent gain alone; assess sample size, confidence intervals, and robustness across dates. No betting-profit claim without verified contemporaneous odds and costs.

## Caveats
The archive's historical win-rate values may have been captured after the race. Boat number is not necessarily the actual entry course. ST, motor, exhibition, wind, and Makulabo 50-race fields are not verified in this model. No public app code or deployment should be changed as a result of this note.
