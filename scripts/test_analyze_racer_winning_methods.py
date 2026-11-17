import unittest
from analyze_racer_winning_methods import analyze
class Tests(unittest.TestCase):
 def test_racer_method_and_course(self):
  racers=[{'boat':i,'racerId':str(4000+i),'nationalWinRate':5.2,'localWinRate':4.9} for i in range(1,7)]
  row={'date':'20261116','venue':24,'race':3,'racers':racers,'finishOrder':[6,1,4,3,5,2],'resultVerified':True,'winningMethod':'まくり差し','winningMethodVerified':True,'entryCourseVerified':True,'entryCourseByBoat':{'1':1,'2':2,'3':3,'4':4,'5':6,'6':5}}
  out=analyze([{'records':[row]}])
  self.assertEqual(out['winningMethods']['まくり差し'],1)
  winner=next(x for x in out['racerEvidence'] if x['racerId']=='4006')
  self.assertEqual(winner['entryCourses']['5']['winningMethods']['まくり差し'],1)
  self.assertTrue(winner['sampleInsufficientForIndividualTechniquePreference'])
  self.assertIsNone(winner['winningMethodSharesOfWinsPercent'])
  self.assertEqual(out['racersMeetingTechniqueSampleThreshold'],0)
  with self.assertRaises(ValueError):analyze([{'records':[row,row]}])
 def test_no_guess_from_boat_number(self):
  racers=[{'boat':i,'racerId':str(4000+i)} for i in range(1,7)]
  row={'date':'20261116','venue':24,'race':1,'racers':racers,'finishOrder':[1,2,3,4,5,6],'resultVerified':True,'winningMethodVerified':False,'entryCourseVerified':False}
  out=analyze([{'records':[row]}])
  self.assertEqual(out['unverifiedWinningMethods'],1)
  self.assertEqual(out['racerEvidence'][0]['entryCourses'],{})
if __name__=='__main__':unittest.main()
