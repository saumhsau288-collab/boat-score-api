# 2026-11-20 実アーティファクトの予想・公式特徴量結合可能性監査

対象: GitHub Actions run 44639859914 / artifact 14586303082 の ZIP を実際に開いて検査。

| 項目 | 実測 |
|---|---:|
| 保存済み予想要求 | 288 |
| HTTP 200 かつ ready=true | 14 |
| ready予想の receivedAt 記録 | 14 |
| ready予想の responseSha256 記録 | 14 |
| ZIP内の `research-official-*.json` / `*feature-snapshot*` ファイル | 0 |
| **このZIPだけで公式特徴量と結合できるready予想** | **0** |

確認した ready レスポンスの構造には `rankedScores`、`method`、`predictionMode`、`missingInputs` 等がある。一方、明示的な6艇別 `scoreInputsByBoat` は既存の監査で0件。

この結果は**当該ZIP内**の収録範囲だけを示す。別の Actions artifact や外部保存先に公式特徴量が存在しないとまでは言えない。公式データの独立収集と同日・同場・同Rでの結合は次の作業。

`scripts/join-prediction-official-features.mjs` は、将来別途収集した公式特徴量をレースキーで結合する研究専用ツール。公式特徴量の収集時刻が予想より早くても、それが元の配信モデルの入力だったと断定しない。校正可能件数0を維持。

本番アプリと予想重みは変更しない。
