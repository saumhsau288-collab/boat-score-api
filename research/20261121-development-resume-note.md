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
