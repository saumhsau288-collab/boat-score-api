import unittest
from compare_offline_predictions import compare


def sample():
    return {'date': '20261116',
            'venueSummary': [{'venue': 1, 'rejectedRaces': [2, 3],
                              'rejectionDetails': [
                                  {'race': 2, 'incidentStatus': 'program_identity_verified',
                                   'incidentEvidence': [{'kind': 'capsize'}]},
                                  {'race': 3, 'incidentStatus': 'unverified', 'incidentEvidence': []}]}],
            'reports': [{'records': [{'date': '20261116', 'venue': 1, 'race': 1,
                                     'finishOrder': [3, 2, 1, 4, 5, 6]}]}]}


def pred(race, pick, before=True):
    return {'date': '20261116', 'venue': 1, 'race': race,
            'capturedBeforeStart': before, 'asOfVerified': before,
            'predictedFinishOrder': pick}


class ComparisonTests(unittest.TestCase):
    def test_eligible_and_exclusions(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate prediction'):
            compare([pred(1, [3, 2, 1]), pred(1, [3, 2, 1], False)], [sample()])

    def test_counts_with_unique_races(self):
        rows = [pred(1, [3, 2, 1]), pred(2, [1, 2, 3]),
                pred(3, [1, 2, 3]), pred(4, [1, 2, 3])]
        result = compare(rows, [sample()])
        self.assertEqual(result['totals']['eligibleCompared'], 1)
        self.assertEqual(result['totals']['exactTrifectaHits'], 1)
        self.assertEqual(result['totals']['verifiedIncidentExcluded'], 1)
        self.assertEqual(result['totals']['unresolvedOfficialExcluded'], 1)
        self.assertEqual(result['totals']['officialResultMissing'], 1)

    def test_unverified_snapshot_is_not_counted(self):
        result = compare([pred(1, [3, 2, 1], False)], [sample()])
        self.assertEqual(result['totals']['unverifiedPredictionSnapshot'], 1)
        self.assertIsNone(result['exactTrifectaHitRatePercent'])

    def test_duplicate_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate prediction'):
            compare([pred(1, [1, 2, 3]), pred(1, [3, 2, 1])], [sample()])


if __name__ == '__main__':
    unittest.main()
