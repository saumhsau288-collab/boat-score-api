import unittest
from report_six_racer_course_methods import report
class Tests(unittest.TestCase):
 def setUp(self):
  self.racers=[{'boat':i,'racerId':str(1000+i)} for i in range(1,7)]
  self.history={'scope':'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION','racerEvidence':[
   {'racerId':'1001','observedStarts':25,'observedWins':6,'winningMethodSharesOfWinsPercent':{'まくり':50},
    'entryCourses':{'4':{'starts':12,'first':3,'winningMethods':{'まくり':2}},'1':{'starts':9,'first':2,'winningMethods':{'逃げ':2}}}},
   {'racerId':'1002','observedStarts':5,'observedWins':1,'winningMethodSharesOfWinsPercent':None,'entryCourses':{}}]}
 def test_thresholds(self):
  r=report(self.history,self.racers)
  self.assertEqual(r['racers'][0]['winningMethodSharesOfWinsPercent']['まくり'],50)
  self.assertEqual(r['racers'][0]['entryCourseWinRatesPercent']['4']['observedWinRatePercent'],25)
  self.assertIsNone(r['racers'][0]['entryCourseWinRatesPercent']['1']['observedWinRatePercent'])
  self.assertIsNone(r['racers'][1]['winningMethodSharesOfWinsPercent'])
  self.assertEqual(r['racers'][2]['status'],'no_verified_historical_sample')
  self.assertFalse(r['scoreChangesProposed'])
 def test_duplicate(self):
  with self.assertRaises(ValueError):report(self.history,self.racers[:5]+[self.racers[0]])
 def test_scope(self):
  with self.assertRaises(ValueError):report({'scope':'LIVE','racerEvidence':[]},self.racers)
if __name__=='__main__':unittest.main()
