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
