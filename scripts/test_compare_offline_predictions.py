import unittest
from compare_offline_predictions import compare


def sample():
    return {'date': '20261116',
            'venueSummary': [{'venue': 1, 'matchedRaces': 1, 'rejectedRaces': [2, 3],
                              'rejectionDetails': [
                                  {'race': 2, 'incidentStatus': 'program_identity_verified',
                                   'incidentEvidence': [{'kind': 'capsize'}]},
                                  {'race': 3, 'incidentStatus': 'unverified', 'incidentEvidence': []}]}],
            'reports': [{'venue': 1, 'records': [{'date': '20261116', 'venue': 1, 'race': 1,
                                     'resultVerified': True,
                                     'finishOrder': [3, 2, 1, 4, 5, 6]}]}]}


def pred(race, pick, before=True):
    return {'date': '20261116', 'venue': 1, 'race': race,
            'capturedBeforeStart': before, 'asOfVerified': before,
            'capturedAt': '2026-11-16T08:00:00+09:00',
            'raceStartAt': '2026-11-16T12:00:00+09:00',
            'captureEvidenceId': 'immutable-archive:20261116:1:' + str(race),
            'predictionModelVersion': 'boat-score-2-test',
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

    def test_flags_alone_are_insufficient(self):
        p = pred(1, [3, 2, 1])
        del p['capturedAt']
        self.assertEqual(compare([p], [sample()])['totals']['unverifiedPredictionSnapshot'], 1)

    def test_after_start_snapshot_excluded(self):
        p = pred(1, [3, 2, 1])
        p['capturedAt'] = '2026-11-16T13:00:00+09:00'
        self.assertEqual(compare([p], [sample()])['totals']['unverifiedPredictionSnapshot'], 1)

    def test_wrong_race_date_excluded(self):
        p = pred(1, [3, 2, 1])
        p['raceStartAt'] = '2026-11-17T12:00:00+09:00'
        self.assertEqual(compare([p], [sample()])['totals']['unverifiedPredictionSnapshot'], 1)

    def test_naive_timestamps_excluded(self):
        p = pred(1, [3, 2, 1])
        p['capturedAt'] = '2026-11-16T08:00:00'
        self.assertEqual(compare([p], [sample()])['totals']['unverifiedPredictionSnapshot'], 1)

    def test_official_venue_count_mismatch_rejected(self):
        source = sample()
        source['venueSummary'] = []
        with self.assertRaisesRegex(ValueError, 'length mismatch'):
            compare([pred(1, [3, 2, 1])], [source])

    def test_official_venue_identity_mismatch_rejected(self):
        source = sample()
        source['reports'][0]['venue'] = 2
        with self.assertRaisesRegex(ValueError, 'venue identity mismatch'):
            compare([pred(1, [3, 2, 1])], [source])

    def test_unverified_official_race_rejected(self):
        source = sample()
        source['reports'][0]['records'][0]['resultVerified'] = False
        with self.assertRaisesRegex(ValueError, 'Unverified official race'):
            compare([pred(1, [3, 2, 1])], [source])

    def test_invalid_finish_order_rejected(self):
        source = sample()
        source['reports'][0]['records'][0]['finishOrder'] = [1, 1, 2, 3, 4, 5]
        with self.assertRaisesRegex(ValueError, 'Invalid official finish order'):
            compare([pred(1, [3, 2, 1])], [source])

    def test_boolean_finish_order_rejected(self):
        source = sample()
        source['reports'][0]['records'][0]['finishOrder'] = [True, 2, 3, 4, 5, 6]
        with self.assertRaisesRegex(ValueError, 'Invalid official finish order'):
            compare([pred(1, [3, 2, 1])], [source])

    def test_float_finish_order_rejected(self):
        source = sample()
        source['reports'][0]['records'][0]['finishOrder'] = [1.0, 2, 3, 4, 5, 6]
        with self.assertRaisesRegex(ValueError, 'Invalid official finish order'):
            compare([pred(1, [3, 2, 1])], [source])

    def test_six_main_and_six_upset_predictions(self):
        p = pred(1, [1, 2, 3])
        p['mainSix'] = [[1, 2, 3], [1, 3, 2], [2, 1, 3],
                        [2, 3, 1], [3, 1, 2], [3, 2, 1]]
        p['upsetSix'] = [[4, 1, 2], [4, 2, 1], [5, 1, 2],
                         [5, 2, 1], [6, 1, 2], [6, 2, 1]]
        result = compare([p], [sample()])
        self.assertEqual(result['totals']['sixPickCompared'], 1)
        self.assertEqual(result['totals']['mainSixHits'], 1)
        self.assertEqual(result['totals']['upsetSixHits'], 0)
        self.assertEqual(result['mainSixHitRatePercent'], 100)
        self.assertIsNone(result['exactTrifectaHitRatePercent'])

    def test_six_picks_reject_duplicates(self):
        p = pred(1, [3, 2, 1])
        p['mainSix'] = [[3, 2, 1]] * 6
        p['upsetSix'] = [[1, 2, 3]] * 6
        self.assertEqual(compare([p], [sample()])['totals']['invalidPredictionExcluded'], 1)

    def test_duplicate_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate prediction'):
            compare([pred(1, [1, 2, 3]), pred(1, [3, 2, 1])], [sample()])


if __name__ == '__main__':
    unittest.main()
