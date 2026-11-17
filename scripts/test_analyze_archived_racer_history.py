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


if __name__ == '__main__':
    unittest.main()
