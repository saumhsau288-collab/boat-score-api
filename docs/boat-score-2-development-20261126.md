# Boat Score 2 — 2026-11-26

Scope: fix-boat-score-2-syntax-20261115; isolated Cloudflare preview only. Do not modify old Render production.

- 495f5ccc: verified morning snapshot categories and coverage.
- 1a94190d: distinguish legacy unverified records in deployment audit.
- b0fa41e7 / 4507f736: wind icon markup diagnostics.
- ca815a9e: extract wind icon number.
- 3be01f9d: provisional angle calculation, not verified compass direction.
- 6aa2d1451f46fcd343c60edc428b6942f9d11cf8: explicit unverified flag.

Last successful deployment: Actions run 45775779694, 3be01f9d. Edogawa 1R code 4, provisional 67.5 degrees; Tamagawa 1R code 11, provisional 225 degrees. Official mapping not established; do not use angles for scoring. Official combined retrieval 9.448 and 20.401 seconds. Morning audit: 0 verified, 58 unverified; do not fabricate historical timestamps. Fresh snapshot verification pending. New flag not yet deployed or tested.

Next: verify official icon mapping, test fresh morning evidence, investigate duplicate retrieval and latency. Preserve existing functionality.

## Follow-up
Run 45777169983 succeeded; unverified wind flag confirmed. Morning evidence remains 0/58. Commit 019ff3bd8031dabdfc33bc8104542e6408e849bc saves weather with combined race data and permits same-race beforeinfo cache reuse for 120 seconds without claiming compass verification. Explicit refresh=1 bypasses reuse. Deployment and latency measurement pending.

## Retrieval timing and access denial
Run 45778367479: beforeinfo reuse 14/34 ms, combined 19452/18459 ms. Run 45779441782 (51cb6eb6): Edogawa both upstream HTTP 403, Tamagawa racer 9448 ms and beforeinfo 9275 ms, combined 9880 ms, reuse 41 ms. Morning evidence remains 0/58. Commit f2c94f23a17681e4d82844df025593ac08a211af makes diagnostic workflow skip redundant beforeinfo probe after explicit 403 and logs coverage/source separately. No application behavior change; deployment test pending.
