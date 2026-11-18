import unittest
from audit_capture_official_overlap import audit


class CaptureOfficialOverlapTests(unittest.TestCase):
    def test_coverage_only(self):
        six = [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
        capture = {'authenticatedBeforeRace': False, 'records': [
            {'date':'20261118','venue':1,'race':1,'httpStatus':200,
             'response':{'ready':True,'main':six,'upset':six}}]}
        official = [{'date':'20261118',
            'venueSummary':[{'venue':1,'matchedRaces':1,'rejectedRaces':[]}],
            'reports':[{'records':[{'date':'20261118','venue':1,'race':1,
                                    'resultVerified':True,'finishOrder':[1,2,3,4,5,6]}]}]}]
        result = audit(capture, official)
        self.assertEqual(result['totals']['officialVerifiedOverlap'],1)
        self.assertFalse(result['accuracyCalculationPermitted'])
        self.assertNotIn('hitRate', str(result))
        with self.assertRaises(ValueError):
            audit({**capture,'authenticatedBeforeRace':True},official)

    def test_duplicate_capture_rejected(self):
        row={'date':'20261118','venue':1,'race':1}
        with self.assertRaises(ValueError):
            audit({'authenticatedBeforeRace':False,'records':[row,row]},[])


if __name__ == '__main__':
    unittest.main()
