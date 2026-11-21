# 2026-11-21 公式HTML artifact 3 ZIP・5レースの内部監査

GitHub Actions artifact ZIP を実際にダウンロードし、ZIP内の JSON メタデータを検査した。

| artifact ID | ファイル | 対象日 | 公式HTML受信時刻 UTC | 予定締切候補 JST | 独立認証 |
|---|---|---|---|---|---|
| 14696720534 | miyajima-2r-racelist.html | 20261120 | 2026-11-21 06:44:21 | 10:42 | false |
| 14696108351 | miyajima-6r-racelist.html | 20261120 | 2026-11-21 06:45:44 | 12:26 | false |
| 14696661231 | venue-21-4r-racelist.html | 20261120 | 2026-11-21 06:53:51 | 10:09 | false |
| 14696661231 | venue-21-5r-racelist.html | 20261120 | 2026-11-21 06:53:52 | 10:36 | false |
| 14696661231 | venue-21-6r-racelist.html | 20261120 | 2026-11-21 06:53:52 | 11:03 | false |

各JSONの `status:200`、`contentType:text/html`、`sha256`、`scheduleDiagnostic.verified:false`、`unverifiedParsedSchedule.verified:false`、`independentlyAuthenticated:false` を確認。HTMLファイル5件とJSONメタデータ5件がZIP内に存在。

**重要**: 5件の公式HTML取得はレース開催日2026-11-20の翌日であり、当日の予想生成時に使われた入力ではない。過去の公式出走表として研究上の参考にはできても、`originalInputsVerified` を true にする根拠にはならない。

元予想の `receivedAt` と公式HTMLの `receivedAt` は混同しない。公式締切の候補も実締切の認証ではない。評価点校正可能0件を維持。本番アプリ・重みは変更しない。
