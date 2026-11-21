# 2026-11-21 保存データの所在確認と再集計の制約

- 朝の予想キャプチャ: GitHub Actions run [44639859914](https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44639859914), artifact `14586303082` (`boat-score-2-morning-raw-44639859914`), 2026-11-21時点 `expired:false`。
- 下関4R〜6Rの事後公式HTML: run [44877687869](https://github.com/saumhsau288-collab/boat-score-api/actions/runs/44877687869), artifact `14696661231`, `expired:false`。
- Git tree SHA `9949de23686a1afe74db9cd95704439842ffc315` を再帰確認: `prediction-captures/` および `official-cutoff-source-evidence.json` はブランチに存在しない。研究CLIのローカル入力をGitリポジトリ内に仮定してはいけない。
- 次の実行は、Actionsアーティファクトを作業環境へ展開してから、データ構造を確認し、未認証の事後HTMLを「締切前の予想証拠」と誤認せずに比較する。
- 事後HTMLのレース別時刻抽出は宮島2R 10:42、6R 12:26、下関4R 10:09、5R 10:36、6R 11:03。全て `verified:false` の診断値。
- **未完了:** アーティファクトZIPの内容と保存済み予想の再照合。評価点更新は禁止。
