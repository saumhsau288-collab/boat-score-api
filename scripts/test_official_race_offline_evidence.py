import unittest
from official_race_offline_evidence import extract,retrospective
class Tests(unittest.TestCase):
 def setUp(self):
  self.row={'date':'20261118','venue':11,'race':3,'resultVerified':True,
    'racers':[{'boat':i,'racerId':str(1000+i),'nationalWinRate':6.5,'localWinRate':5.2,'motorTwoWinRate':35} for i in range(1,7)]}
  self.row.update({'historicalProgramSource':'official_B_archive','historicalResultSource':'official_K_archive','capturedBeforeStart':False,'asOfVerified':False})
  self.report={'date':'20261118','reports':[{'records':[self.row]}]}
  self.history={'scope':'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION','racerEvidence':[]}
 def test_extract(self):
  self.assertEqual(extract(self.report,11,3)['racers'][0]['racerId'],'1001')
 def test_retrospective(self):
  result=retrospective(self.report,self.history,11,3)
  self.assertTrue(result['retrospectiveOnly'])
  self.assertEqual(result['racers'][0]['scoreLowerBound'],47.5)
  self.assertFalse(result['accuracyCalculationPermitted'])
 def test_missing(self):
  with self.assertRaises(ValueError):extract(self.report,11,4)
 def test_unverified(self):
  self.row['resultVerified']=False
  with self.assertRaises(ValueError):extract(self.report,11,3)
 def test_wrong_archive_date(self):
  self.report['date']='20261117'
  with self.assertRaises(ValueError):extract(self.report,11,3)
 def test_missing_provenance(self):
  del self.row['historicalProgramSource']
  with self.assertRaises(ValueError):extract(self.report,11,3)
 def test_forged_pre_race_flag(self):
  self.row['capturedBeforeStart']=True
  with self.assertRaises(ValueError):extract(self.report,11,3)
 def test_duplicate(self):
  self.report['reports'].append({'records':[self.row]})
  with self.assertRaises(ValueError):extract(self.report,11,3)
if __name__=='__main__':unittest.main()
