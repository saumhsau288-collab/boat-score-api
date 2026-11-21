# 2026-11-20 下関4R〜6R 実HTML時刻表比較

GitHub Actions run **44877687869**、2026-11-21 06:53:51–52Z、公式 `racelist?hd=20261120&jcd=21&rno={4,5,6}`。

| Race | Old candidate | HTML race-column diagnostic | HTML bytes | SHA-256 |
|---|---|---|---:|---|
| 4R | 08:51 | **10:09** | 67,925 | `0e526dfe46444205efb7b704502cef65f952b367569128a5881f9a71de8099a7` |
| 5R | 08:51 | **10:36** | 67,802 | `3a0cb361b92f5d2cf5ee9fef4294a71dda119ee9573ae57471eb0ec428fb5029` |
| 6R | 08:51 | **11:03** | 67,903 | `63e2bdc58909dd04fc3e4f8423e115e016e7c2ba5c64c423ac5545a16b590974` |

3件とも HTTP 200、最終URL一致、`parsedTableMatched:true`、`scheduleDiagnostic.reason:"source_not_verified"`。**いずれも未認証診断値であり、正式な締切時刻の認証ではない。**

この結果は、旧方式が各レースではなく同一場の共通表の先頭時刻を誤用した可能性を裏付ける。保存予想の事前取得・的中率・評価点更新には使用しない。元の本番アプリは変更していない。
