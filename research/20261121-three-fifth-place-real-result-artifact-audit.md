# 2026-11-21 三レース公式結果取得の実測状況

## 出典
- GitHub Actions run 44884271279, conclusion success
- artifact 14698839042, `three-fifth-place-official-results-44884271279`
- `toda-1.raw.json`, `toda-1.parsed.json`, `naruto-3.raw.json`, `naruto-3.parsed.json`, `fukuoka-5.raw.json`, `fukuoka-5.parsed.json`

## 成否
- 戸田1R (20261120, venue 02): `raw_html_saved`, 56,864文字、公式結果パーサー `parsed_needs_independent_review`
- 鳴門3R (20261120, venue 14): `raw_html_saved`, 56,795文字、公式結果パーサー `parsed_needs_independent_review`
- 福岡5R (20261120, venue 22): `fetch_failed`, `The operation was aborted due to timeout`, `not_saved`。ワークフロー全体成功と個別取得成功は区別する。

## 公式結果HTMLからの本番ST（結果後データ）
| 艇 | 戸田1R | 鳴門3R |
|---|---:|---:|
| 1 | .12 | .15 |
| 2 | .10 | .17 |
| 3 | .12 | .17 |
| 4 | .14 | .15 |
| 5 | .15 | .18 |
| 6 | .17 | .19 |

両レースともスタート情報の並びは1,2,3,4,5,6であり、進入コースはそれぞれ艇番と同じ。これは当該2レースの観察に限る。

## 結果ページの着順
- 戸田1R: 2-1-5-3-4-6。4号艇（登録番号4283）は5着、実ST .14、4コース。
- 鳴門3R: 4-5-3-2-1-6。1号艇（登録番号4732）は5着、実ST .15、1コース。
- 4号艇/1号艇の5着は単にスタートの大幅な出遅れだけで説明できない。ターン・展開等は追加証拠なしに原因確定しない。

## 次の対応
- 福岡5Rのみ再取得（タイムアウト）。別の3レース全体を繰り返す必要はない。
- 結果後のSTを予想時点の入力に混ぜない。
- 独立した予想前データと校正用holdoutが揃うまで重み変更しない。
- 元のBoat Score・Boat Score 2本番には触れない。
