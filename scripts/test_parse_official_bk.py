import unittest
from parse_official_bk import parse_b,parse_k,join,venue_section
class Tests(unittest.TestCase):
 def test_venue_isolation(self):
  s='STARTB\n24BBGN\nOMURA\n1R\n23BBGN\nKARATSU\n1R'
  self.assertIn('OMURA',venue_section(s,24,'B'))
  self.assertNotIn('KARATSU',venue_section(s,24,'B'))
  with self.assertRaises(ValueError):venue_section(s,22,'B')
 def test_b(self):
  lines=['　１Ｒ 一般']
  for i in range(1,7):lines.append(f'{i} {4590+i}加藤政彦42東京53B1 5.95 41.28 6.07 46.34 79 30.11 64 39.56 2 262')
  self.assertEqual(len(parse_b('\n'.join(lines))[1]),6)
 def test_k(self):
  lines=[' 1R  1-2-3  940   1-2-3 450','   1R 一般 H1800m']
  for i in range(1,7):lines.append(f'  0{i}  {i} {4590+i} 加 藤 政 彦 79 64 6.86 {i} 0.02')
  self.assertEqual(parse_k('\n'.join(lines))[1]['finishOrder'],[1,2,3,4,5,6])
 def test_join(self):
  b={1:[{'boat':i,'racerId':str(4590+i)} for i in range(1,7)]}
  k={1:{'finishOrder':[1,2,3,4,5,6],'racerIds':{i:str(4590+i) for i in range(1,7)}}}
  x=join(b,k,'20261116',24)
  self.assertEqual(x['matchedRaces'],1)
  self.assertFalse(x['records'][0]['eligibleForWeightCalibration'])
  k[1]['racerIds'][1]='9999'
  self.assertEqual(join(b,k,'20261116',24)['matchedRaces'],0)
 def test_actual_omura_race_one(self):
  b="""24BBGN
　１Ｒ  一般　　　　          Ｈ１８００ｍ  電話投票締切予定１５：１６
1 4598加藤政彦42東京53B1 5.95 41.28 6.07 46.34 79 30.11 64 39.56 2 262 3423  10
2 5321一色颯輝24愛知55B1 5.48 39.08 4.56 22.22 66 26.26 28 32.26 2 5 33655    5
3 4521小池公生39福岡51B1 4.90 22.99 4.20 20.00 49 34.34 50 37.89 421 546 4    9
4 4231鈴木裕隆43愛知56B1 5.50 34.62 5.32 27.27 70 40.00 86 24.73 1 363 163    7
5 4114深澤達徳46東京53B1 4.38 20.69 5.91 27.27 13 42.72 65 28.72 5 461 565    5
6 5109川崎智稔27岡山52B1 4.68 26.44 4.44 28.00 19 33.01 55 37.89 252 456 1    6"""
  k="""24KBGN
           1R  1-2-3     940    1-2-3     450    1-2     290    1-2     380
   1R       一般　　　　                 H1800m  晴　  風  南東　 1m  波　  1cm
  着 艇 登番 　選　手　名　　ﾓｰﾀｰ ﾎﾞｰﾄ 展示 進入 ｽﾀｰﾄﾀｲﾐﾝｸ ﾚｰｽﾀｲﾑ 逃げ
  01  1 4598 加　藤　　政　彦 79   64  6.86   1    0.02     1.48.9
  02  2 5321 一　色　　颯　輝 66   28  6.90   2    0.06     1.50.1
  03  3 4521 小　池　　公　生 49   50  6.86   3    0.14     1.52.3
  04  4 4231 鈴　木　　裕　隆 70   86  6.90   4    0.12     1.53.6
  05  6 5109 川　崎　　智　稔 19   55  6.82   6    0.09      .  .
  06  5 4114 深　澤　　達　徳 13   65  6.89   5    0.13      .  ."""
  pb=parse_b(venue_section(b,24,'B'))
  pk=parse_k(venue_section(k,24,'K'))
  self.assertEqual(len(pb[1]),6)
  self.assertEqual(pk[1]['finishOrder'],[1,2,3,4,6,5])
  result=join(pb,pk,'20261116',24)
  self.assertEqual(result['matchedRaces'],1)
  self.assertEqual(result['records'][0]['racers'][0]['motorTwoWinRate'],30.11)
  self.assertFalse(result['records'][0]['capturedBeforeStart'])
if __name__=='__main__':unittest.main()
