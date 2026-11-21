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

## 2026-11-21 実ZIP照合・行ずれ修正
- 実ZIPの `20261120-44639859914.json` を再確認: ready14件（戸田1R、宮島1R・2R、鳴門3R、徳山3Rなど）、各 `rankedScores` 6艇、`authenticatedBeforeRace:false`。ZIP内に公式着順の独立証拠ファイルなし。
- `audit-score-result-join.mjs` の**重要な行ずれ不具合**を修正。従来は288件の比較結果に14件のready評価点を配列インデックスで結合していたため、非readyレースが先にあると誤対応の可能性があった。元の `capture.records` インデックスに対応付けて修正し、非ready/ready/非readyの回帰テスト追加。
- 修正後のCIを確認すること。引き続き実際の的中率・配点調整は保留。

## 2026-11-21 公式結果の構造監査
- `scripts/audit-official-result-evidence.mjs` を追加し、独立保存した `verified-official-results.json` の `results[]` について日付・場・レース、6艇着順、公式 `raceresult` URL、同一レースの重複を検査。
- CLI: `node scripts/audit-official-result-evidence.mjs verified-official-results.json`。**実ファイルの公式証拠がまだない場合は架空の結果を作成しない。**
- `verified:true` という自己申告や形式整合は、公式サイトの内容を独立に確認した証拠にならないため、監査結果は常に `independentlyAuthenticated:false`、`eligibleForCalibration:false`。
- 新しい公式結果監査テストのCI結果を確認し、失敗時は研究ブランチだけ修正する。

## 2026-11-21 公式結果の直接確認
- BOAT RACE公式 `/owpc/pc/race/raceresult` を14レース分直接閲覧。**13レースは公式6艇着順と3連単配当を確認、津6R（場09）は公式「レース中止」**。中止は着順なしとして別枠に保存。
- 転記データ: `research/evidence/20261120-official-result-pages-transcription.json`。各結果に公式URLと6艇の着順、払戻金を保存。手動転記なので将来は公式HTMLスナップショット・ハッシュとの照合が必要。
- 13件の公式着順確認は予想取得時刻の事前認証とは**別**。保存予想の `authenticatedBeforeRace:false` は変えず、的中率・配点最適化・本番反映を引き続き禁止。
- 津6Rは予想readyだったが当日開催中止で、バックテスト分母から除外すること。

## 2026-11-21 実ZIP締切候補の異常検出（重要）
- 実ZIP `official-cutoff-source-evidence.json` の14 readyレースを、保存 `receivedAt` と `cutoffCandidate.cutoffAt` で直接突合。候補前9件、候補後5件。候補の `pageIdentity.status` は**全14件 `identity_markers_ambiguous`**、独立検証済み締切は0。
- **明らかな同一場・別レースの締切候補重複**: 宮島(17)1R/2R/6R がすべて `2026-11-20T01:16:00Z`、下関(21)4R/5R/6R がすべて `2026-11-19T23:51:00Z`。レース固有の締切として信用できない。抽出ロジックまたは公式ページIDの取り違えを疑い、検証完了まで使用禁止。
- 津(09)6Rは公式中止なので候補前9件のうち1件は結果照合から除外。**9件を有効な事前予想と呼ばない**。
- 公式結果13件の取得と事前予想の認証は別条件。的中率、重み調整、本番反映は引き続き保留。
