# Real archived capture inspection: 2026-11-20

Artifact: `boat-score-2-morning-raw-44639859914`, extracted JSON `20261120-44639859914.json`.

Observed directly in the archived ZIP:
- 288 records; 14 rows with `response.ready===true` and `httpStatus===200`.
- Those 14 response objects contain `main`, `upset`, `rankedScores`, `startCoursesVerified`, `exhibitionVerification`, etc.
- **None of the ready responses contains `response.scoreInputsByBoat`.** Aggregate `rankedScores` cannot reconstruct six distinct racers' national/local win rates, historical average ST, motor 2-ren rate, actual entry course, exhibition time, or course-specific last-50 podium rate.
- Top-level `authenticatedBeforeRace:false`; separately archived cutoff candidates are not official verified cutoffs.
- Hence **0 of the 14 ready archived rows can be run through the independent twelve-method predictor with the required six-racer feature inputs**. This is not a zero-hit-rate finding; no valid denominator exists.
- The adapter now recognizes legacy `motorTwoWinRate` when present, but never guesses missing entry course, exhibition time, or course-specific last-50 podium rate.

Next research dependency: collect and persist timestamped raw six-racer feature snapshots BEFORE races, then separately authenticate official cutoff and finish order. The existing deployed API and app are not modified.
