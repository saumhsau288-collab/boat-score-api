import tempfile,unittest
from pathlib import Path
from inspect_official_bk import inspect
class Test(unittest.TestCase):
 def test_cp932(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'test.txt';p.write_bytes('出走表\n唐津'.encode('cp932'))
   x=inspect(p);self.assertEqual(x['status'],'decoded_text_preview')
   self.assertEqual(x['parsedRaces'],0)
 def test_empty(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'empty.txt';p.write_bytes(b'')
   with self.assertRaises(ValueError):inspect(p)
if __name__=='__main__':unittest.main()
