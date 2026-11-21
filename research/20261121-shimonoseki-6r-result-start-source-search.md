# 2026-11-21 下関6R公式結果のスタート情報探索

目的: 2026-11-20 下関6Rの6号艇について、実際の進入コースとレースSTを、予想前の平均STとは分離して調べる。

## 実施した探索
- GitHub Actions 実行履歴を複数ページ調査。見つかった `Research Shimonoseki official cutoff HTML` run 44877687869 の artifact 14696661231 は、前回展開済みの**出走表**HTML（下関4R/5R/6R）と取得メタデータ。公式**結果**HTMLのスタート情報を含むものと混同しない。
- リポジトリの `research/evidence/20261120-official-result-pages-transcription.json` は公式着順の転記を保持するが、進入・実STを保持しない。
- 既存の `scripts/extract-official-result-racers.mjs` は `raceresult` HTML内の「スタート情報」表から6艇の進入順を抽出できる設計。抽出結果は `parsed_needs_independent_review` として扱う。
- `scripts/fetch-official-result-pages-research.mjs` は保存予想のレースキーから公式結果HTMLを研究用に取得できるが、実行・保存した事実と独立認証は別。

## 現時点の確定事項
- 下関6R: 保存評価点1位は6号艇57.12、公式着順5着。
- 実際の進入コース: **未確認**。
- レース本番ST: **未確認**。
- 展示ST・展示タイム・当時の風/波: **未確認**。
- 公式結果ページ: `https://www.boatrace.jp/owpc/pc/race/raceresult?hd=20261120&jcd=21&rno=6`（レースキーに対応する公式URL）。
- 結果ページHTMLを実際に取得・抽出するまでは、6号艇=6コース、平均ST0.14=本番ST等の推定をしない。

## 次の手順
対象レースの公式結果HTMLを研究用に取得し、保存ハッシュ・取得時刻・出走選手ID・着順・スタート情報の6艇並び・各STを検査する。結果HTMLに実STが無い場合は別の公式結果/スタート情報ソースを探す。結果を得ても予想前入力とみなさず、因果関係を断定しない。

本番アプリと評価点は変更しない。校正可能0件。
