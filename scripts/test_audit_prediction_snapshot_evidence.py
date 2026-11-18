import unittest
from audit_prediction_snapshot_evidence import audit


def record():
    return {'date': '20261116', 'venue': 1, 'race': 1,
            'capturedBeforeStart': True, 'asOfVerified': True,
            'capturedAt': '2026-11-16T08:00:00+09:00',
            'raceStartAt': '2026-11-16T12:00:00+09:00',
            'captureEvidenceId': 'example-archive-commit', 'predictionModelVersion': 'test',
            'mainSix': [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]],
            'upsetSix': [[4, 1, 2], [4, 2, 1], [5, 1, 2], [5, 2, 1], [6, 1, 2], [6, 2, 1]]}


class EvidenceTests(unittest.TestCase):
    def test_metadata_is_not_independent_authentication(self):
        result = audit([record()])
        self.assertEqual(result['statusCounts'], {'metadata_passes_authenticity_unverified': 1})
        self.assertEqual(result['independentlyAuthenticatedSnapshots'], 0)

    def test_duplicate_evidence_id_is_rejected(self):
        second = record()
        second['race'] = 2
        result = audit([record(), second])
        self.assertEqual(result['statusCounts']['duplicate_evidence_id'], 1)

    def test_invalid_timing_is_rejected(self):
        item = record()
        item['capturedAt'] = '2026-11-16T13:00:00+09:00'
        self.assertEqual(audit([item])['statusCounts'], {'snapshot_metadata_invalid': 1})

    def test_duplicate_tickets_rejected(self):
        item = record()
        item['mainSix'] = [[1, 2, 3]] * 6
        self.assertEqual(audit([item])['statusCounts'], {'six_plus_six_picks_invalid': 1})


if __name__ == '__main__':
    unittest.main()
