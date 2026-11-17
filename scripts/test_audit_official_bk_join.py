import unittest
from audit_official_bk_join import audit
class AuditTests(unittest.TestCase):
 def test_guard_and_summary(self):
  racers=[{"boat":i,"racerId":str(4000+i),"nationalWinRate":float(8-i/2),"localWinRate":float(8-i/2),"motorTwoWinRate":float(50-i)} for i in range(1,7)]
  r={"date":"20261116","venue":24,"race":1,"racers":racers,"finishOrder":[1,2,3,4,5,6],"resultVerified":True,"asOfVerified":False,"capturedBeforeStart":False}
  x=audit({"records":[r]})
  self.assertEqual(x["partialWinnerMatches"],1)
  self.assertEqual(x["pointInTimeVerifiedRaces"],0)
  with self.assertRaises(ValueError):audit({"records":[r,r]})
if __name__=="__main__":unittest.main()
