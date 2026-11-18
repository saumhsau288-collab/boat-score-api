import unittest
from audit_official_score_input_coverage import audit

class Tests(unittest.TestCase):
    def race(self, extra=None):
        return {'resultVerified':True,'capturedBeforeStart':False,'asOfVerified':False,
                'racers':[{'boat':i,'nationalWinRate':5.2,'localWinRate':4.8,
                           'motorTwoWinRate':38.0,**(extra or {})} for i in range(1,7)]}
    def test_missing_two_inputs_not_imputed(self):
        result=audit({'records':[self.race()]})
        self.assertEqual(result['validRacerInputCounts']['nationalWinRate'],6)
        self.assertEqual(result['validRacerInputCounts']['recent50WinRate'],0)
        self.assertEqual(result['validRacerInputCounts']['exhibitionScore'],0)
        self.assertEqual(result['blockedFiveInputRaces'],1)
        self.assertEqual(result['preRaceAuthenticatedRaces'],0)
        self.assertFalse(result['weightCalibrationPermitted'])
    def test_complete_historical_inputs_still_not_authenticated(self):
        result=audit({'records':[self.race({'recent50WinRate':20,'exhibitionScore':50})]})
        self.assertEqual(result['completeFiveInputRaces'],1)
        self.assertFalse(result['weightCalibrationPermitted'])
    def test_bad_provenance_rejected(self):
        row=self.race()
        row['capturedBeforeStart']=True
        with self.assertRaises(ValueError):audit({'records':[row]})

if __name__=='__main__':unittest.main()
