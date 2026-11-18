import unittest
from preview_racer_score_evidence import preview

class Tests(unittest.TestCase):
    def test_no_fabricated_score_and_small_sample(self):
        row={'racerId':'4001','observedStarts':3,'observedWins':1,'observedWinRatePercent':33.33,
             'sampleInsufficientForIndividualTechniquePreference':True,
             'officialNationalWinRateSamples':[5.1], 'officialLocalWinRateSamples':[4.8],
             'winningMethods':{'まくり':1},'entryCourses':{'4':{'starts':3}}}
        evidence={'scope':'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION','racerEvidence':[row]}
        result=preview(evidence,['4001','4002'])
        self.assertFalse(result['weightsChanged'])
        self.assertEqual(result['racers'][0]['status'],'insufficient_technique_sample')
        self.assertIsNone(result['racers'][0]['winningMethods'])
        self.assertIsNone(result['racers'][0]['proposedScore'])
        self.assertEqual(result['racers'][1]['status'],'no_verified_history')
        with self.assertRaises(ValueError):preview(evidence,['4001','4001'])
    def test_descriptive_only_at_threshold(self):
        row={'racerId':'4001','observedStarts':20,'observedWins':5,'observedWinRatePercent':25,
             'sampleInsufficientForIndividualTechniquePreference':False,
             'officialNationalWinRateSamples':[6.2], 'officialLocalWinRateSamples':[],
             'winningMethods':{'差し':3},'winningMethodSharesOfWinsPercent':{'差し':60},
             'entryCourses':{'2':{'starts':10}}}
        result=preview({'scope':'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION','racerEvidence':[row]},['4001'])
        self.assertEqual(result['racersWithDescriptiveTechniqueEvidence'],1)
        self.assertEqual(result['racers'][0]['winningMethodSharesOfWinsPercent']['差し'],60)
        self.assertIsNone(result['racers'][0]['scoreDelta'])

if __name__=='__main__':unittest.main()
