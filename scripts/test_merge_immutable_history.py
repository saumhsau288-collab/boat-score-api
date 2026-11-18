import json
import tempfile
import unittest
from pathlib import Path
from merge_immutable_history import merge_reports


class MergeHistoryTests(unittest.TestCase):
    def test_new_and_conflicting_preserved(self):
        with tempfile.TemporaryDirectory() as root:
            incoming, archive = Path(root, 'new'), Path(root, 'old')
            incoming.mkdir()
            archive.mkdir()
            old = {'reports': [{'records': [{'race': 1}]}]}
            changed = {'reports': [{'records': [{'race': 2}]}]}
            fresh = {'reports': [{'records': [{'race': 3}]}]}
            (archive / '20261116.json').write_text(json.dumps(old))
            (incoming / '20261116.json').write_text(json.dumps(changed))
            (incoming / '20261117.json').write_text(json.dumps(fresh))
            result = merge_reports(incoming, archive)
            self.assertEqual(result['added'], ['20261117.json'])
            self.assertEqual(result['conflictingPreserved'], ['20261116.json'])
            self.assertEqual(json.loads((archive / '20261116.json').read_text()), old)
            self.assertEqual(json.loads((archive / '20261117.json').read_text()), fresh)

    def test_identical_is_idempotent(self):
        with tempfile.TemporaryDirectory() as root:
            incoming, archive = Path(root, 'new'), Path(root, 'old')
            incoming.mkdir()
            (incoming / '20261116.json').write_text(json.dumps({'reports': [{'records': [1]}]}))
            self.assertEqual(merge_reports(incoming, archive)['added'], ['20261116.json'])
            self.assertEqual(merge_reports(incoming, archive)['identical'], ['20261116.json'])

    def test_empty_report_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            incoming = Path(root, 'new')
            incoming.mkdir()
            (incoming / '20261116.json').write_text('{"reports":[]}')
            with self.assertRaisesRegex(ValueError, 'Empty incoming report'):
                merge_reports(incoming, Path(root, 'archive'))

    def test_missing_incoming_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(ValueError, 'No incoming'):
                merge_reports(Path(root, 'missing'), Path(root, 'archive'))


if __name__ == '__main__':
    unittest.main()
