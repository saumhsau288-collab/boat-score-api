# 2026-11-21 保存入力特徴量の所在調査と次の取得条件

## GitHub上の既存証拠
- `research/20261120-saved-prediction-evidence-inventory.md`: `prediction-captures/` に追跡済みファイルなし。既存 morning artifact は run 44639859914 / artifact 14586303082。
- `research/20261120-actual-morning-capture-evidence.md`: 288要求、HTTP200が203、ready 14、明示的な6艇別 `scoreInputsByBoat` は0。
- `scripts/audit-capture-score-inputs.mjs`: APIレスポンスの明示的な `scoreInputsByBoat` のみを厳格に検査。異なるスキーマでの入力値の存在までは否定できない。
- `research/20261121-four-top-score-fifth-place-case-review.md`: 02-1, 14-3, 22-5, 21-6 の高得点艇が実際は5着。艇番固有の減点を正当化しない。

## 誤解を防ぐ境界
`rankedScores` は予測**結果**であり、元の6艇別勝率・ST・モーター・コース・展示・まくらぼを復元できない。保存されている `method:weighted_national50_local20_motor30_unvalidated` はデプロイ済み予想APIの方法を示すが、検証用の別モデルと混ぜない。

事後に取得した公式データを「当時の予想入力」として差し込まない。評価点の変更・検証済み的中率の公表は不可。

## 次の研究用取得で最低限保存すべき項目
- `date`, `venue`, `race`, `receivedAt`, `sourceUrl`, `responseSha256`, `predictorVersion`, `predictionMode`, `method`
- `rankedScores` と元の `main` 三連単、各6艇の `racerId`, `boat`, `predictedCourse`, `actualCourse`（未確定なら null）
- 各6艇の `nationalWinRate`, `localWinRate`, `averageST`, `motorTwoWinRate`, `recent50WinRate`, `exhibitionTime`。各値に取得元と取得時刻、未取得理由を付ける
- 公式締切**予定**時刻と公式結果は別ソースとして保存し、締切実時刻の認証と混同しない
- 必須特徴量欠損なら `eligibleForCalibration:false` を維持

研究ブランチ限定。元のBoat Score / Boat Score 2 の配信コードや重みは変更しない。
