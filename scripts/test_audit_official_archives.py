import tempfile
import unittest
from pathlib import Path
from audit_official_archives import inspect_archive, audit

class AuditTests(unittest.TestCase):
    def test_missing(self):
        self.assertEqual(inspect_archive('/no/such/archive.lzh')['status'],'missing')
    def test_header_and_invalid(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'x.lzh';p.write_bytes(b'error html')
            self.assertEqual(inspect_archive(p)['status'],'invalid_lzh_header')
            p.write_bytes(bytes([22,0])+b'-lh5-'+bytes(32))
            self.assertEqual(inspect_archive(p)['status'],'header_verified')
    def test_no_fabricated_snapshots(self):
        with tempfile.TemporaryDirectory() as d:
            report=audit(d,'2026-11-16','2026-11-16')
            self.assertEqual(report['total'],2)
            self.assertEqual(report['verifiedPreRaceSnapshots'],0)
            self.assertFalse(report['weightCalibrationReady'])

if __name__=='__main__':unittest.main()
