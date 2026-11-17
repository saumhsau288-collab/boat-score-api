#!/usr/bin/env python3
"""Join every venue present in both official daily B/K archives; no predictions."""
import argparse,json,re
from pathlib import Path
from parse_official_bk import venue_section,parse_b,parse_k,join
def audit_all_venues(btext,ktext,date):
    marker=lambda text,kind:{int(v) for v in re.findall(r'^([0-2][0-9])'+kind+r'BGN\s*$',text,re.M) if 1<=int(v)<=24}
    both=sorted(marker(btext,'B')&marker(ktext,'K'))
    reports=[]
    for venue in both:
        report=join(parse_b(venue_section(btext,venue,'B')),parse_k(venue_section(ktext,venue,'K')),date,venue)
        reports.append({'venue':venue,'matchedRaces':report['matchedRaces'],'rejectedRaces':report['rejectedRaces']})
    return {'date':date,'venueSummary':reports,'reports':[join(parse_b(venue_section(btext,v,'B')),parse_k(venue_section(ktext,v,'K')),date,v) for v in both]}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--b',required=True);p.add_argument('--k',required=True);p.add_argument('--date',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    data=audit_all_venues(Path(a.b).read_text(encoding='cp932'),Path(a.k).read_text(encoding='cp932'),a.date)
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    Path(a.output).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'date':a.date,'venueSummary':data['venueSummary']},ensure_ascii=False))
