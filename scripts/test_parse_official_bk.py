import unittest
from parse_official_bk import parse_b,parse_k,join
class Tests(unittest.TestCase):
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
if __name__=='__main__':unittest.main()
