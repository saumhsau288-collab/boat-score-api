import json
import tempfile
import unittest
from pathlib import Path
from analyze_archived_racer_history import load_unique_days


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


if __name__ == '__main__':
    unittest.main()
