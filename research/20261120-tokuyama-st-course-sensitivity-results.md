# Tokuyama 2026-11-20 1R — hypothetical ST/course sensitivity results

Research only; no production changes, no authenticated pre-deadline forecast or verified prediction accuracy.

Local Node.js reproduction of scripts/compare-hypothetical-st-course-adjustments.mjs and its test passed. Inputs are retrospective base scores by boat [54,24,53,23,22,34], archived displayed average ST [.17,.16,.15,.18,null,.12], and observed course labels [1,2,3,4,5,6]. Fifth ST remains missing; no zero-is-fastest interpretation. None of these inputs is independently authenticated as a pre-deadline capture.

Five scenarios (baseline, st_weak, inside_weak, st_inside_weak, st_inside_strong) all rank boats **1,3,6,2,4,5**.

Applying the *research-only* ordered-triple strength .56*first + .29*second + .15*third gives the same top six in every scenario:
1. 1-3-6
2. 3-1-6
3. 1-3-2
4. 1-3-4
5. 3-1-2
6. 1-3-5

Reported retrospective finish 1-3-2 is third in every scenario. This is NOT a live forecast, a validated win, or evidence that ST/course adjustments improve accuracy.

First/third boat scores:
- baseline: boat1 54; boat3 53
- st_weak: boat1 54.4333; boat3 53.5
- inside_weak: boat1 55; boat3 53.6667
- st_inside_weak: boat1 55.4333; boat3 54.1667
- st_inside_strong: boat1 56.8667; boat3 55.3333

Conclusion: tested ST/course bonus strengths are insufficient to alter ranking or top-six triple order in this race. Do not increase weights solely to fit the known result. Next evaluate multiple independently sourced pre-deadline races and verified official results; keep original deployed predictions and all production code unchanged.
