import json
import tempfile
import unittest
from pathlib import Path
from audit_official_incidents import audit_reports


class IncidentAuditTests(unittest.TestCase):
    def test_verified_unverified_and_legacy(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = {'venueSummary': [
                {'venue': 1, 'rejectedRaces': [1, 2],
                 'rejectionDetails': [
                     {'race': 1, 'incidentStatus': 'program_identity_verified',
                      'incidentEvidence': [{'kind': 'flying_start'}]},
                     {'race': 2, 'incidentStatus': 'unverified',
                      'unverifiedIncidentEvidence': [{'kind': 'capsize'}]}]},
                {'venue': 2, 'rejectedRaces': [3]}]}
            Path(directory, '20261117.json').write_text(json.dumps(payload))
            result = audit_reports(directory)
            self.assertEqual(result['totals']['rejectedRaces'], 3)
            self.assertEqual(result['totals']['identityVerifiedIncidentRaces'], 1)
            self.assertEqual(result['totals']['unclassifiedLegacyRaces'], 1)
            self.assertEqual(result['totals']['unverifiedIncidentEvidenceRaces'], 1)
            self.assertEqual(result['incidentKinds'], {'flying_start': 1})
            self.assertFalse(result['refundVerified'])

    def test_unverified_evidence_cannot_be_counted_as_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = {'venueSummary': [{'venue': 1, 'rejectedRaces': [1],
                'rejectionDetails': [{'race': 1, 'incidentStatus': 'unverified',
                    'incidentEvidence': [{'kind': 'capsize'}]}]}]}
            Path(directory, '20261117.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError, 'not identity verified'):
                audit_reports(directory)


if __name__ == '__main__':
    unittest.main()
