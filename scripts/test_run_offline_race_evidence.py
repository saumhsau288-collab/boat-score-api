import unittest
from run_offline_race_evidence import run
class TestRunner(unittest.TestCase):
 def setUp(self):
  self.race={'date':'20261118','venue':11,'race':3,
   'racers':[{'boat':i,'racerId':str(1000+i),'nationalWinRate':6.5,'localWinRate':5.2,'motorTwoWinRate':35} for i in range(1,7)]}
  self.history={'scope':'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION','racerEvidence':[]}
 def test_actual_pipeline(self):
  r=run(self.race,self.history)
  self.assertEqual(len(r['racers']),6)
  self.assertEqual(r['racers'][0]['scoreLowerBound'],47.5)
  self.assertEqual(r['racers'][0]['scoreUpperBound'],62.5)
  self.assertEqual(r['racers'][0]['missingScoreInputs'],['recent50WinRate','exhibitionScore'])
  self.assertFalse(r['accuracyCalculationPermitted'])
 def test_reject_invalid(self):
  self.race['racers'][0]['nationalWinRate']=100
  with self.assertRaises(ValueError):run(self.race,self.history)
if __name__=='__main__':unittest.main()
