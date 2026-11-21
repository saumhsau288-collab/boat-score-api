# 2026-11-20 公式締切予定時刻と保存予想の受信時刻（13完走レース）

2026-11-21 に BOAT RACE 公式の各場レース一覧ページを確認した。予想受信時刻は Actions run 44639859914 / artifact 14586303082 / raw 20261120-44639859914.json の receivedAt（UTC）を JST に変換した値。

| 場コード | R | 保存予想受信 JST | 公式締切予定 JST | 予定締切までの分 |
|---|---:|---|---|---:|
| 02 | 1 | 08:42:52 | 10:45 | 122.1 |
| 17 | 1 | 08:44:57 | 10:16 | 91.0 |
| 17 | 2 | 08:48:25 | 10:42 | 113.6 |
| 14 | 3 | 08:51:19 | 09:30 | 38.7 |
| 18 | 3 | 08:51:49 | 09:35 | 43.2 |
| 15 | 4 | 08:54:49 | 16:52 | 477.2 |
| 21 | 4 | 08:55:42 | 10:09 | 73.3 |
| 21 | 5 | 08:59:16 | 10:36 | 96.7 |
| 22 | 5 | 08:59:15 | 12:47 | 227.7 |
| 24 | 5 | 08:59:34 | 17:10 | 490.4 |
| 13 | 6 | 09:01:14 | 13:05 | 243.8 |
| 17 | 6 | 09:01:55 | 12:26 | 204.1 |
| 21 | 6 | 09:01:52 | 11:03 | 121.1 |

公式レース一覧（2026-11-20）:
- 02: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=02
- 17: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=17
- 14: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=14
- 18: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=18
- 15: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=15
- 21: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=21
- 22: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=22
- 24: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=24
- 13: https://www.boatrace.jp/owpc/pc/race/raceindex?hd=20261120&jcd=13

完走13件は全件でHTTP受信が公式の締切**予定**時刻より早い。09-6 津6Rは中止のため結果比較から除外。戸田02-1は1R実施後に3R以降中止順延の記載あり。

注意: 事後に確認した公式サイトの締切予定時刻は、当日の実際の締切や予想生成時刻の独立認証を保証しない。保存された予想レスポンスには6艇の明示的 scoreInputsByBoat がなく、評価点の校正は不可。independentlyAuthenticatedBeforeRace=0、eligibleForCalibration=0 を維持する。本番アプリと予想重みは変更しない。
