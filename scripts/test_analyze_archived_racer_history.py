import json
import tempfile
import unittest
from pathlib import Path
from analyze_archived_racer_history import load_unique_days, archive_date_coverage, archived_quality_summary


class ArchivedHistoryTests(unittest.TestCase):
    def test_no_reports(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaisesRegex(ValueError, 'No daily reports'):
                load_unique_days(d)

    def test_duplicate_race_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            race = {'date': '20261117', 'venue': 1, 'race': 1}
            payload = {'reports': [{'records': [race, race]}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError, 'Duplicate archived race'):
                load_unique_days(d)

    def test_date_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            payload = {'reports': [{'records': [{'date': '20261116', 'venue': 1, 'race': 1}]}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError, 'Date mismatch'):
                load_unique_days(d)

    def test_valid_two_day_archive(self):
        with tempfile.TemporaryDirectory() as d:
            for day, race_no in [('20261116', 1), ('20261117', 2)]:
                payload = {'reports': [{'records': [{'date': day, 'venue': 1, 'race': race_no}]}]}
                Path(d, day + '.json').write_text(json.dumps(payload))
            records, days = load_unique_days(d)
            self.assertEqual(days, 2)
            self.assertEqual(len(records), 2)

    def test_empty_report_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, '20261117.json').write_text(json.dumps({'reports': []}))
            with self.assertRaisesRegex(ValueError, 'Empty daily report'):
                load_unique_days(d)

    def test_malformed_filename_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, 'invalid.json').write_text(json.dumps({'reports': [{'records': []}]}))
            with self.assertRaisesRegex(ValueError, 'Invalid report filename'):
                load_unique_days(d)

    def test_cross_day_duplicate_key_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            for day in ['20261116', '20261117']:
                payload = {'reports': [{'records': [{'date': '20261116', 'venue': 1, 'race': 1}]}]}
                Path(d, day + '.json').write_text(json.dumps(payload))
            with self.assertRaises(ValueError):
                load_unique_days(d)


    def test_date_coverage_gap(self):
        with tempfile.TemporaryDirectory() as d:
            for day in ['20261115', '20261117']:
                Path(d, day + '.json').write_text('{}')
            coverage = archive_date_coverage(d)
            self.assertEqual(coverage['missingCalendarDates'], ['2026-11-16'])
            self.assertTrue(coverage['hasDateGaps'])
            self.assertEqual(coverage['archivedDayCount'], 2)

    def test_date_coverage_contiguous(self):
        with tempfile.TemporaryDirectory() as d:
            for day in ['20261116', '20261117']:
                Path(d, day + '.json').write_text('{}')
            self.assertFalse(archive_date_coverage(d)['hasDateGaps'])

    def test_invalid_calendar_date_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, '20260230.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Invalid archive date'):
                archive_date_coverage(d)


    def test_archive_quality_counts_rejections(self):
        with tempfile.TemporaryDirectory() as d:
            payload = {'reports': [{'records': [{'date': '20261117', 'venue': 1, 'race': 1}]}],
                       'venueSummary': [{'venue': 1, 'matchedRaces': 1, 'rejectedRaces': [2, 3]},
                                        {'venue': 2, 'matchedRaces': 0, 'rejectedRaces': [1]}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            quality = archived_quality_summary(d)
            self.assertEqual(quality['totalVerifiedRaces'], 1)
            self.assertEqual(quality['totalRejectedRaces'], 3)
            self.assertEqual(quality['days'][0]['venuesWithNoVerifiedRaces'], [2])

    def test_archive_quality_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            payload = {'reports': [{'records': []}],
                       'venueSummary': [{'venue': 1, 'matchedRaces': 1, 'rejectedRaces': []}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError, 'count mismatch'):
                archived_quality_summary(d)


    def test_rejection_reasons_and_legacy_unknown(self):
        with tempfile.TemporaryDirectory() as d:
            payload = {'reports': [{'records': []}], 'venueSummary': [
                {'venue': 1, 'matchedRaces': 0, 'rejectedRaces': [1],
                 'rejectionDetails': [{'race': 1, 'reason': 'missing_valid_result', 'incidentStatus': 'unverified'}]},
                {'venue': 2, 'matchedRaces': 0, 'rejectedRaces': [2]}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            quality = archived_quality_summary(d)
            self.assertEqual(quality['rejectionReasons'], {'missing_valid_result': 1, 'legacy_unclassified': 1})

    def test_rejection_detail_mismatch_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            payload = {'reports': [{'records': []}], 'venueSummary': [
                {'venue': 1, 'matchedRaces': 0, 'rejectedRaces': [1],
                 'rejectionDetails': [{'race': 2, 'reason': 'missing_valid_result'}]}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError, 'Rejection detail race mismatch'):
                archived_quality_summary(d)


    def test_incident_evidence_counts_only_identity_verified(self):
        with tempfile.TemporaryDirectory() as d:
            payload = {'reports': [{'records': []}], 'venueSummary': [
                {'venue': 1, 'matchedRaces': 0, 'rejectedRaces': [1, 2],
                 'rejectionDetails': [
                     {'race': 1, 'reason': 'missing_valid_result',
                      'incidentStatus': 'program_identity_verified',
                      'incidentEvidence': [{'kind': 'flying_start', 'boat': 2, 'racerId': '4002'}]},
                     {'race': 2, 'reason': 'missing_valid_result',
                      'incidentStatus': 'unverified', 'incidentEvidence': [],
                      'unverifiedIncidentEvidence': [{'kind': 'capsize', 'boat': 4, 'racerId': '9999'}]}]}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            quality = archived_quality_summary(d)
            self.assertEqual(quality['identityVerifiedIncidentRaces'], 1)
            self.assertEqual(quality['incidentEvidenceCounts'], {'flying_start': 1})
            self.assertEqual(quality['unverifiedIncidentEvidenceRaces'], 1)

    def test_incident_evidence_without_identity_check_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            payload = {'reports': [{'records': []}], 'venueSummary': [
                {'venue': 1, 'matchedRaces': 0, 'rejectedRaces': [1],
                 'rejectionDetails': [{'race': 1, 'reason': 'missing_valid_result',
                     'incidentStatus': 'unverified',
                     'incidentEvidence': [{'kind': 'capsize', 'boat': 4, 'racerId': '9999'}]}]}]}
            Path(d, '20261117.json').write_text(json.dumps(payload))
            with self.assertRaisesRegex(ValueError, 'Incident evidence lacks'):
                archived_quality_summary(d)

if __name__ == '__main__':
    unittest.main()
