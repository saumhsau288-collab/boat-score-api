# 2026-11-21 既存取得コードの再利用可否（研究ブランチ）

確認したコード:
- `scripts/capture-existing-boat-score-2-predictions.mjs`: 配信中の `/api/predict/selected-race` を読み取り、`requestedAt`, `receivedAt`, `responseSha256`, `response`, `run` を保存。書き込み先はデプロイ済みWorkerではなく Actions artifact。
- `scripts/capture-research-official-features.mjs`: 公式 `racelist` HTMLを読み取り、レスポンスSHA256、受信時刻、公式URLとパーサ検証結果を記録。デプロイコードを変更しない。
- `boat-score-2-research-feature-snapshot.js`: 6艇の選手識別、コース、直近50走、展示、スタートを検証可能な形で保持する独立の研究用スナップショット。
- `.github/workflows/boat-score-2-capture-morning-predictions.yml`: JST 08:00 相当のスケジュール（cron 23:00 UTC）と手動実行の研究用取得。実行遅延や欠測があり得る。

## 結論
これらは既存の研究用コードとして再利用可能。ただし公式特徴量スナップショットは、配信中の予想APIが**実際に使った入力**であることの証明ではない。双方を同一レースキーで並べることはできるが、取得時刻・選手ID・モデルバージョンが一致しない限り、`usedByDeployedPredictor` は `false` または `unverified` とする。

## 研究用の次の実装
1. 予想と公式特徴量を同一レースキーで結合し、各々の取得時刻とソースを保持する。
2. 元の予想入力の証拠がない場合は `originalInputsVerified:false`, `eligibleForCalibration:false`。
3. 公式特徴量を予想入力として遡及的に代入しない。
4. 研究用の検証・取得は本番へのデプロイと分離する。

本番アプリ・元の予想重みは変更しない。
