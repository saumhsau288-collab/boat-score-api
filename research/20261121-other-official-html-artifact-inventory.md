# 2026-11-21 別Actions artifactの所在確認

GitHub Actions の artifact 一覧を対象runごとに確認した結果（2026-11-21）。

| run | artifact ID | artifact名 | 種類 | expired |
|---|---:|---|---|---|
| 44877687869 | 14696661231 | research-shimonoseki-cutoff-44877687869 | 下関の公式締切HTML調査 | false |
| 44876959545 | 14696720534 | research-miyajima-racelist-html-44876959545 | 宮島の公式出走表HTML調査 | false |
| 44877070810 | 14696108351 | research-miyajima-racelist-html-44877070810 | 宮島の公式出走表HTML調査 | false |

この段階で確認できたのは artifact の存在・名前・期限状態のみ。ZIP内部の6艇別数値、取得日時、対象レース、選手ID、完全性は**未確認**。公式HTMLを保存したことと、配信予想モデルがその情報を使ったことは異なる。

次にZIP内容を検査し、対象日・場・Rと保存された元予想との一致、収集時刻、6艇の識別子、数値の存在を確認する。後から取得した公式ページを元の予想入力と偽らない。校正可能件数0のまま。

研究用ブランチのみ。本番アプリ・評価点の重みは変更しない。
