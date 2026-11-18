import unittest
from combine_race_score_method_evidence import combine
class Tests(unittest.TestCase):
 def setUp(self):
  self.race={'date':'20261118','venue':11,'race':3,
    'racers':[{'boat':i,'racerId':str(1000+i),'nationalWinRate':6.5,'localWinRate':5.2,'motorTwoWinRate':35} for i in range(1,7)]}
  self.score={'preRaceAuthenticated':False,'productionChanged':False,'partialRank':[1,2,3,4,5,6],
   'fullScoreRank':None,'scoreBounds':[{'boat':i,'lower':47.5,'upper':62.5,'unknownMaximum':15,'missing':['recent50WinRate','exhibitionScore']} for i in range(1,7)]}
  self.history={'scope':'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION','racerEvidence':[{'racerId':'1001','observedStarts':22,'observedWins':5,'winningMethodSharesOfWinsPercent':{'まくり':40},'entryCourses':{}}]}
 def test_combined(self):
  result=combine(self.race,self.score,self.history)
  self.assertEqual(len(result['racers']),6)
  self.assertEqual(result['racers'][0]['historicalWinningMethodShares']['まくり'],40)
  self.assertEqual(result['racers'][1]['historicalMethodStatus'],'no_verified_historical_sample')
  self.assertEqual(result['racers'][2]['scoreLowerBound'],47.5)
  self.assertFalse(result['accuracyCalculationPermitted'])
  self.assertFalse(result['scoreWeightsChanged'])
 def test_reject_swapped_score(self):
  self.score['scoreBounds'][0]['lower']=55
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
 def test_reject_wrong_missing_fields(self):
  self.score['scoreBounds'][0]['missing']=['exhibitionScore']
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
 def test_reject_wrong_unknown_weight(self):
  self.score['scoreBounds'][0]['unknownMaximum']=10
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
 def test_invalid_provenance(self):
  self.score['preRaceAuthenticated']=True
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
 def test_missing_boat(self):
  self.score['scoreBounds']=self.score['scoreBounds'][:5]
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
 def test_false_full_ranking(self):
  self.score['fullScoreRank']=[1,2,3,4,5,6]
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
 def test_invalid_official_rate(self):
  self.race['racers'][0]['localWinRate']=12
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
 def test_missing_score_metadata(self):
  del self.score['scoreBounds'][0]['missing']
  with self.assertRaises(ValueError):combine(self.race,self.score,self.history)
if __name__=='__main__':unittest.main()
