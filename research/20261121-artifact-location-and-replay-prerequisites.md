# 2026-11-21 保存データの所在確認と再集計の制約

- 朝の予想キャプチャ: GitHub Actions run [44639859914](https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914), artifact `14586303082` (`boat-score-2-morning-raw-44639859914`), 2026-11-21時点 `expired:false`。
- 下関4R〜6Rの事後公式HTML: run [44877687869](https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44877687869), artifact `14696661231`, `expired:false`。
- Git tree SHA `9949de23686a1afe74db9cd95704439842ffc315` を再帰確認: `prediction-captures/` および `official-cutoff-source-evidence.json` はブランチに存在しない。研究CLIのローカル入力をGitリポジトリ内に仮定してはいけない。
- 次の実行は、Actionsアーティファクトを作業環境へ展開してから、データ構造を確認し、未認証の事後HTMLを「締切前の予想証拠」と誤認せずに比較する。
- 事後HTMLのレース別時刻抽出は宮島2R 10:42、6R 12:26、下関4R 10:09、5R 10:36、6R 11:03。全て `verified:false` の診断値。
- **未完了:** アーティファクトZIPの内容と保存済み予想の再照合。評価点更新は禁止。

## 2026-11-21 検証ゲート再点検（追記）

- 保存済み2026-11-20のready予想14件は、6艇の最終出力評価点を保持するが、当時の6艇入力特徴量は保持しない。
- 公式結果の手動転記では13レースに着順があり、津6Rは中止。結果を確認したことと、予想が締切前に認証済みであることは別の証拠である。
- 保存キャプチャは `authenticatedBeforeRace:false`、公式締切候補はレースIDが曖昧で独立認証0件。候補時刻との大小比較を有効なバックテスト件数に変換しない。
- 研究用の `boat-score-2-research-feature-snapshot.js` は艇番と選手IDの対応を維持し、全国・当地勝率、モーター2連率、進入、直近50走、ST、展示タイムを検証済みの範囲で格納する。ただし、**現在の朝の実キャプチャへ自動接続済みという意味ではない**。
- 次の実装優先順位: (1) 実際の取得元URLとレスポンス本文の保存、(2) 同一取得時点の6艇入力特徴量と選手ID、(3) レース固有の公式締切・ページIDを独立に照合、(4) 中止を除いた公式着順との結合、(5) 別日・別開催のホールドアウト検証。
- 自己申告の `verified:true` や `authenticatedBeforeRace:true`、合成テストの成功だけを独立認証とみなさない。**実レース校正サンプル0件、評価点の配分変更禁止**を維持する。
