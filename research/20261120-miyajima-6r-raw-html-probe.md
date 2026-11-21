# 2026-11-20 宮島6R 実HTMLのレース別締切抽出

GitHub Actions run 44877070810、2026-11-21 06:45:44Z。公式URL:
https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261120&jcd=17&rno=6

- HTTP 200、最終URL一致、text/html;charset=UTF-8
- HTML 69,236 bytes、SHA-256 `62eca943b5e57990a421188d984b33a607f4cba1a12fff78eff3b693bce03e4b`
- `unverifiedParsedSchedule.candidateCutoffJst="12:26"`、`parsedTableMatched=true`
- `scheduleDiagnostic={verified:false,cutoffJst:null,reason:"source_not_verified"}`
- 元の保存候補10:16は1Rの値であり、6Rの実HTML時刻表からは12:26を選択できた。
- **これは取得時点のHTML表示の構造照合のみ。** 予想を締切前に取得した証拠ではなく、認証済み締切や精度評価には利用しない。

2Rについては `research/20261120-miyajima-2r-raw-html-probe.md` を参照。
