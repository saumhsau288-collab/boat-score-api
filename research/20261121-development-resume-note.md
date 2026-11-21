# Boat Score 2 開発再開メモ — 2026-11-21

## 再開位置
- Repository: saumhsau288-collab/boat-score-api
- Research branch: research/st-course-holdout-20261121
- Draft PR #248: https://github.com/saumhsau288-collab/boat-score-api/pull/248
- **本番アプリ・main・現行の評価点は変更しない。PRのマージやデプロイはユーザー承認が必要。**
- 最終コミット: `74d01d63d5c5d0ce8b96aad9180b26447d56c637` （保存したHTMLのバイト列を直接照合する変更と文字コードのテスト）
- 最後に成功を確認したActions: `44873836170` （上記最新変更より前）
- **次にすること: 最新コミットのActions実行状況を確認し、失敗時はjob logsを調べて修正する。**

## 現在の作業
公式HTMLを保存して、元データのSHA-256、バイト数、HTTP応答、取得開始・完了時刻、公式URL、開催日・場・レース番号、ページ識別情報、締切時刻候補を研究専用で検査する。保存したHTMLの元のバイト列を使い、UTF-8で復元できないデータは別理由で除外する。検査結果は元の証拠を上書きせず別ファイルに保存。

主要ファイル:
- `scripts/capture-official-html-evidence.mjs`
- `scripts/audit-official-race-html-capture.mjs`
- `scripts/audit-official-race-html-capture.test.mjs`
- `scripts/audit-saved-official-race-evidence.mjs`
- `scripts/audit-saved-official-race-evidence.test.mjs`
- `.github/workflows/boat-score-2-scoring-tests.yml`
- `boat-score-2-start-course-historical-comparison.js`
- `boat-score-2-start-course-historical-comparison.test.mjs`

## 検証の重要条件
- 公式HTMLを保存しただけで公式締切やレースIDの独立確認が済んだとは判定しない。
- 予想時点の6艇分の入力特徴量、公式締切より前の取得時刻、公式結果の着順と選手ID一致を揃える。
- 過去データから結果を推測・捏造しない。合成テスト成功を実レースでの精度改善と呼ばない。
- 2026-11-20の保存データ調査では288件の取得試行、ready 14件、6艇の`scoreInputsByBoat`を持つものは0件、独立確認済み公式締切0件。現時点で実レースの独立検証サンプルは確保できていない。
- ST・コース補正や選手勝率配点の変更は、実レースで独立検証してから判断する。

## 次の実作業
1. 最新Actionsを確認して赤ならログから修正する。
2. 保存済み公式HTMLの実データを安全にオフライン監査する導線を作る（可能な範囲で）。
3. 実際の事前6艇特徴量・公式締切・公式着順の同一レース照合を完成させる。
4. 評価点を実結果と比較し、複数レースの独立ホールドアウトで検証する。

## 2026-11-21 続報
- GitHub Actions `44874039462` 成功: 保存HTMLの一括オフライン検査テストを含む。
- 実際の過去朝データのZIP artifactは、実行 `44639859914` に `boat-score-2-morning-raw-44639859914` (artifact ID `14586303082`, 66,177 bytes, 現時点で未期限切れ) として存在することを確認。
- **このartifactは朝データのJSON等であり、公式HTML+メタデータのペアが入っているとは確認していない。** ZIPを検査しない限り、今回のHTML監査ツールにそのまま投入できるとは主張しない。
- 次に進む際は、このartifactの中身を検査して利用可能な証拠を分類する。レース前6艇特徴量・公式締切・結果の独立検証が揃うまでは配点の更新禁止。

## 2026-11-21 実際のartifact ZIPを確認した結果
- `44639859914` の artifact ID `14586303082` を取得し、ZIP内の17件を実際に確認。
- 17件すべてJSON。公式HTML + その取得メタデータのペアは入っていない。
- `20261120-44639859914.json`: 288試行、HTTP成功203、ready 14、captureStart `2026-11-19T23:42:35.912Z`、captureEnd `2026-11-20T00:02:25.160Z`、captureTimeJst `08:42`。
- `20261120-44639859914-score-inputs.json`: ready 14、明示的6艇入力を持つready 0、入力欠損ready 14、独立認証済み事前証拠0、評価点変更許可false。
- `20261120-44639859914-calibration-readiness.json`: ready 14、締切不明14、6艇入力欠損14、配点調整適格0。
- `20261120-44639859914-cutoff-candidates.json`: 締切候補あり14、候補より前9・後5、**公式締切独立確認0**。候補の時刻を公式締切とみなさない。
- 次の開発は、公式HTMLの証拠と6艇の事前評価入力を同一レース・同一収集時点で残す仕組みを研究用で検証すること。既存のJSONから未記録の6艇入力を推定しない。

## 2026-11-21 ZIP実体検査（確認済み）
- Artifact `14586303082` を実際にダウンロードし、ZIP内17件のJSONを列挙・検査した。**HTML/メタデータのペアは0組**で、HTML一括監査の入力には使えない。
- `20261120-44639859914.json`: 288件試行、HTTP成功203件、ready14件。収集開始 `2026-11-19T23:42:35.912Z`、終了 `2026-11-20T00:02:25.160Z`。日本時間で8:42頃から開始（8:00ちょうどではない）。
- `20261120-44639859914-score-inputs.json`: ready14件中、明示的な6艇入力証拠0件。5項目（全国・当地・モーター2連率・直近50走・展示）の有効フィールド数すべて0。
- `20261120-44639859914-calibration-readiness.json`: ready14件すべて公式締切未確認・6艇元入力欠落。結果検証も未完了。
- **実レースに基づく配点変更は不可。** 次は既存APIの応答構造とキャプチャ処理を確認し、6艇分の入力を根拠付きで保存する研究専用方法を設計・テストする。

## 2026-11-21 実ZIPの最終評価点調査
- ZIP内 `20261120-44639859914.json` のready14件を個別確認し、**14件すべてに、艇番1〜6が一意で数値スコアを持つ `response.rankedScores` が存在**。
- これは**出力済み最終評価点**であって、勝率・モーター・直近50走などの元入力 `scoreInputsByBoat` の証拠ではない。実際に `startCoursesVerified:false` は14件すべて。
- 研究用 `scripts/audit-captured-ranked-scores.mjs` をCLIからも利用できるようにした。例: `node scripts/audit-captured-ranked-scores.mjs prediction-captures/20261120-44639859914.json`。
- この確認によっても、**公式結果・締切前取得の独立認証が無いため、精度計算や配点調整は許可しない**。

## 2026-11-21 結果照合の研究用検査
- GitHub Actions `44875061565` 成功（commit `286e806099708f6b707f3ffae91128d10af434a9`）。
- `scripts/audit-score-result-join.mjs` を追加。保存された最終6艇評価点の有無と、既存の厳格な公式結果照合ゲートの保留理由を結合。**評価点があるだけでは照合可能としない。**
- CLI: `node scripts/audit-score-result-join.mjs prediction-captures/20261120-44639859914.json`。公式結果を独立検証できた場合のみ第2引数に `verified-results.json` を渡す。結果なしの場合は保留判定。
- 今回のCLI変更後のCIは別途確認すること。現時点では公式結果・公式締切・事前認証の独立証拠は不足。予想的中率と配点改善は主張しない。
