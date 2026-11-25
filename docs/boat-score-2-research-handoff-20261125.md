# Boat Score 2 開発・研究引き継ぎ — 2026-11-25 JST

## 固定条件
- 旧本番 https://boat-score.onrender.com/ は絶対に変更しない。
- 対象 https://boat-score-2-preview.saumh-sau-288.workers.dev/
- Repository: saumhsau288-collab/boat-score-api
- Branch: fix-boat-score-2-syntax-20261115
- Worker: worker.js
- Workflow: .github/workflows/boat-score-2-preview-deploy.yml
- 既存4方式・本命6点/穴6点・朝8時候補60本・横スクロールUIを維持。研究結果を無断で予想へ反映しない。

## 確認済み公開版
- 公開コミット f99db5e299f7b334d2ebd9cb18424893d0c8c049
- Build 20261125-archive-health-v1
- 公開実行 https://github.com/saumhsau288-collab/boat-score-api/actions/runs/45573967728
- 構文、既存回帰テスト、UTC/JST自動収集振り分け、研究用API、公開後検証が成功。
- 自動収集実行記録、全レースの保存済み評価点API、欠落着順の研究用再取得を追加。

## 実測した研究結果
- 実行 https://github.com/saumhsau288-collab/boat-score-api/actions/runs/45574401582
- 11/24: 朝180R、公式6艇着順照合156R。11/25: 朝156R、締切前保存132R、当該実行で着順照合11R。合計167R。
- 厳密な予想順位・時刻がそろう照合は0R。167Rは探索研究のみ。現行4方式の的中率ではない。
- 内3艇の評価点差3点以内: 4号艇3着以内1/4=25.0%、それ以外82/163=50.3%。
- 外3艇のいずれか3着以内: 2/4=50.0%、それ以外136/163=83.4%。
- 4件のみなので仮説の確定不可。競り合い・進路阻害の実証ではない。
- 11/25 17:20 JST頃に直前収集の起動・終了を確認。ただし直前アーカイブ有効件数0、着順アーカイブ有効件数0（再取得した着順は研究実行内のみ）。根本原因は未確定。

## 最新研究コード（未実行）
- コミット 9c1fc5c4befab44a19b508bb5a7038d1e8195c26
- 研究専用ワークフローのみ変更。既存Worker・予想ロジックの変更なし。
- 隣接艇1/2→3、2/3→4、3/4→5、4/5→6の評価点差と入賞率を比較。外艇評価順位上位/下位で層別。
- 評価点差3・5・10・15点、展示ST差0.05秒、外艇ST差0.03秒等は仮条件。
- 公式の過去展示情報を再取得し、実際の展示進入コースを使用。レース後取得は締切前証拠とは区別。F/L等非数値ST除外。
- 予想順位・時刻の揃う検証、時刻だけ確認できた評価点、探索研究、事後展示研究を分ける。

## 次の手順
1. https://github.com/saumhsau288-collab/boat-score-api/actions/workflows/boat-score-2-preview-deploy.yml を開く。
2. Branch: fix-boat-score-2-syntax-20261115、Read-only research: ON、Run workflow。
3. 実行URLを受け取り、GitHub Actionsログの COVERAGE / RECOVERY / HISTORICAL_EXHIBITION / SCORE_PAIR / ST_PAIR / INNER_BLOCK / SPREAD / ST_TIME を確認。
4. 母数と欠損を明示し、展示データの取得可否・内隣の能力・外艇自身の能力・開催場別差を分析。小標本で結論を出さない。
5. 直前情報・着順自動保存の原因調査を続ける。必要なら収集失敗理由と締切判定を検証。
6. 新しい結果・変更コミット・公開状況・未完了事項を節目ごとに引き継ぎログへ追記する。

公開が必要なWorker変更の場合のみ Read-only research: OFF で実行。研究のみの場合はON。チャットから新規workflow dispatchは未確認のため、ユーザーに実行を依頼する。未実行の作業を完了と記載しない。
