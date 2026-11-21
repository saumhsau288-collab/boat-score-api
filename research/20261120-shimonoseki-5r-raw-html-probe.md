# 2026-11-20 下関5R 公式HTML締切候補の訂正

GitHub Actions run **44877498676**、2026-11-21 06:51:21Z。対象:
https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261120&jcd=21&rno=5

- HTTP 200、最終URL一致、text/html;charset=UTF-8
- 67,802 bytes、SHA-256 `ad7e0cb54083238449ec52d41dd641de14503e3edb4a60a6496344a1139ff36b`
- HTMLスケジュール表から5R列 `10:36` を抽出。 `parsedTableMatched:true`
- 保存済み旧候補 `08:51` と**105分の差**。同一場4R/5R/6Rで08:51が重複していた旧方式の誤選択を裏付ける。
- 診断ゲートは `verified:false`、`reason:"source_not_verified"`。公式の事後表示の構造解析であり、予想の事前認証や的中率検証には利用しない。
