# 2026-11-21 予想14件の受信時刻と未認証締切候補の照合

入力: GitHub Actions run 44639859914 artifact 14586303082 の raw JSON `20261120-44639859914.json`。候補時刻の根拠は `research/20261120-five-race-archived-capture-vs-cutoff-diagnostic.md`。

すべて2026-11-20 JST。受信時刻は raw JSON `receivedAt` をUTCからJSTへ変換した。締切候補は事後取得の未認証値であり、実際の締切時刻の独立認証ではない。

| 場コード | R | HTTP受信 JST | 締切候補 JST | 差（分） |
|---|---:|---|---|---:|
| 02 | 1 | 08:42:52 | 未確認 | — |
| 17 | 1 | 08:44:57 | 未確認 | — |
| 17 | 2 | 08:48:25 | 10:42 | +113.6 |
| 14 | 3 | 08:51:19 | 未確認 | — |
| 18 | 3 | 08:51:49 | 未確認 | — |
| 15 | 4 | 08:54:49 | 未確認 | — |
| 21 | 4 | 08:55:42 | 10:09 | +73.3 |
| 21 | 5 | 08:59:16 | 10:36 | +96.7 |
| 22 | 5 | 08:59:15 | 未確認 | — |
| 24 | 5 | 08:59:34 | 未確認 | — |
| 09 | 6 | 09:00:38 | 未確認（中止） | — |
| 13 | 6 | 09:01:14 | 未確認 | — |
| 17 | 6 | 09:01:55 | 12:26 | +204.1 |
| 21 | 6 | 09:01:52 | 11:03 | +121.1 |

14件のうち、事後の締切候補と比較可能5件、未確認9件。比較可能な5件は受信時刻が候補より早い。ただし独立に認証された事前予想0件、6艇の明示的入力特徴量0件、評価点校正対象0件。津6R中止は結果比較から除外。

この資料は時刻診断のみ。元のBoat Score、Boat Score 2、本番予測重みは変更しない。

## 締切候補の未確認レース（調査対象）
次の8件は完走レースであり、締切候補が未確認: 02-1、17-1、14-3、18-3、15-4、22-5、24-5、13-6。
09-6は中止につき結果照合の対象外だが、取得記録は保持する。

各レースの公式レース一覧URL:
- 02-1: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=02
- 17-1: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=17
- 14-3: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=14
- 18-3: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=18
- 15-4: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=15
- 22-5: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=22
- 24-5: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=24
- 13-6: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=13

これらのリンクは調査入口であり、締切時刻を確認した証拠ではない。公式時刻の独立確認が済むまで未認証を維持する。
