# 2026-11-20 宮島2R 実HTML抽出器の初回検証

GitHub Actions run 44876850478 (2026-11-21 06:42:58Z)、artifact 14695299898。公式URL:
https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261120&jcd=17&rno=2

- HTTP 200、最終URL一致、Content-Type text/html;charset=UTF-8
- 生HTML 69,202 bytes、SHA-256 `75e0e682b393c778fd8b4149e3612b12c436e0175a2b3b211435d617c0fb15e6`
- `extractCutoffFromHtmlScheduleTable({html,expectedRace:2,sourceVerified:false})` 結果: `{"verified":false,"cutoffJst":null,"reason":"source_not_verified"}`
- 重要: `source_not_verified` はHTML内の対象12列テーブルの構造抽出が通り、**最終的なソース認証ゲートで拒否**されたことを意味する。表未発見なら `schedule_table_not_found`、曖昧なら `ambiguous_schedule_tables` になる。
- 現在の実行ログは候補時刻を返さないため、公式表示の2R=10:42との**実HTMLでの値の一致はまだ未確認**。次に診断専用の非認証値を別フィールドに出し、`verified:false` を保持して照合する。
- この実行は前日レースの事後取得。保存済み予想の締切前認証ではなく、予想精度や重み調整には利用不可。

原本は14日保持のGitHub Actions artifactに保存。元アプリ・本番コードは変更していない。
