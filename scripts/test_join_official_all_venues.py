import unittest
from join_official_all_venues import audit_all_venues
class Tests(unittest.TestCase):
 def test_empty_and_missing_venue(self):
  self.assertEqual(audit_all_venues('STARTB','STARTK','20261116')['reports'],[])
  self.assertEqual(audit_all_venues('24BBGN\\n','23KBGN\\n','20261116')['reports'],[])
if __name__=='__main__':unittest.main()
