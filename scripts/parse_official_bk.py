#!/usr/bin/env python3
"""Strict B/K race join; B program figures are historical but capture time is unverified."""
import argparse,json,re,unicodedata
from pathlib import Path
VENUE=re.compile(r'ボートレース\s*([^\s　]+)')
B_RACE=re.compile(r'^\s*([０-９]{1,2})Ｒ\s')
K_RACE=re.compile(r'^\s*([1-9]|1[0-2])R\s')
B_BOAT=re.compile(r'^([1-6])\s+(\d{4})(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+)\s+(\d+\.\d{2})\s+(\d+)\s+(\d+\.\d{2})(?:\s|$)')
K_FINISH=re.compile(r'^\s*(0[1-6])\s+([1-6])\s+(\d{4})\s')
K_METHODS=('逃げ','差し','まくり','まくり差し','抜き','恵まれ')
K_METHOD=re.compile(r'ﾚｰｽﾀｲﾑ\s*(まくり差し|まくり|逃げ|差し|抜き|恵まれ)')
K_COURSE=re.compile(r'^\s*(0[1-6])\s+([1-6])\s+(\d{4})\s+.*?\s+\d+\s+\d+\s+\d+\.\d{2}\s+([1-6])\s+')
K_PAY=re.compile(r'^\s*([1-9]|1[0-2])R\s+([1-6])-([1-6])-([1-6])\s+\d+')
def venue_section(text,venue,kind):
    """Isolate one official venue block; never mix races from different venues."""
    marker=re.compile(r'^([0-2][0-9])'+kind+r'BGN\s*$',re.M)
    matches=list(marker.finditer(text))
    if not matches:
        raise ValueError('venue_markers_missing')
    matching=[i for i,m in enumerate(matches) if int(m.group(1))==venue]
    if len(matching)!=1:
        raise ValueError('venue_missing_or_duplicate')
    i=matching[0]
    return text[matches[i].end():matches[i+1].start() if i+1<len(matches) else len(text)]

def parse_b(text):
    races={};current=None
    for line in text.splitlines():
        m=B_RACE.match(line)
        if m:
            current=int(unicodedata.normalize('NFKC',m.group(1)));races[current]=[];continue
        if current is None:continue
        m=B_BOAT.match(line)
        if not m:continue
        boat,ident,prefix,nat,nat2,loc,loc2,motor,motor2,bno,b2=m.groups()
        racer={'boat':int(boat),'racerId':ident,'nationalWinRate':float(nat),'nationalTwoRate':float(nat2),'localWinRate':float(loc),'localTwoRate':float(loc2),'motorNumber':int(motor),'motorTwoWinRate':float(motor2),'boatNumber':int(bno),'boatTwoRate':float(b2)}
        if not 0<=racer['nationalWinRate']<=10 or not 0<=racer['localWinRate']<=10 or not 0<=racer['motorTwoWinRate']<=100:continue
        races[current].append(racer)
    return {r:sorted(v,key=lambda x:x['boat']) for r,v in races.items() if len(v)==6 and {x['boat'] for x in v}==set(range(1,7)) and len({x['racerId'] for x in v})==6}

# Only explicit result-row incident status is evidence. Header legends are not.
K_INCIDENT_ROW=re.compile(r'^\s*(F|L|転覆|転|沈没|沈|落水|落|妨害|妨|失格|失)\s+([1-6])\s+(\d{4})\s')
K_INCIDENT_KIND={'F':'flying_start','L':'late_start','転':'capsize','転覆':'capsize','沈':'sinking','沈没':'sinking','落':'overboard','落水':'overboard','妨':'disqualification','妨害':'disqualification','失':'disqualification','失格':'disqualification'}


def parse_k_incident_evidence(text):
    """Audit explicit incident rows in each race, without inferring refund or exclusion."""
    incidents={};current=None
    for line in text.splitlines():
        match=K_RACE.match(line)
        if match:
            current=int(match.group(1))
            incidents.setdefault(current,[])
            continue
        if current is None:
            continue
        match=K_INCIDENT_ROW.match(line)
        if match:
            code,boat,racer_id=match.groups()
            evidence={'kind':K_INCIDENT_KIND[code], 'statusCode':code,
                      'boat':int(boat),'racerId':racer_id}
            if evidence not in incidents[current]:
                incidents[current].append(evidence)
    return {race:rows for race,rows in incidents.items() if rows}

def parse_k(text):
    races={};current=None;pay={};courses={};methods={}
    for line in text.splitlines():
        m=K_PAY.match(line)
        if m and len({int(m.group(i)) for i in (2,3,4)})==3:pay[int(m.group(1))]=[int(m.group(i)) for i in (2,3,4)]
        m=K_RACE.match(line)
        if m:
            current=int(m.group(1));races[current]=[];courses[current]=[];methods[current]=None;continue
        if current is None:continue
        mm=K_METHOD.search(line)
        if mm:methods[current]=mm.group(1)
        m=K_FINISH.match(line)
        if m:
            races[current].append((int(m.group(1)),int(m.group(2)),m.group(3)))
            cm=K_COURSE.match(line)
            if cm and cm.group(3)==m.group(3) and cm.group(2)==m.group(2) and cm.group(1)==m.group(1):courses[current].append((int(cm.group(2)),int(cm.group(4))))
    valid={}
    for r,v in races.items():
        if len(v)!=6 or [x[0] for x in v]!=list(range(1,7)) or len({x[1] for x in v})!=6:continue
        order=[x[1] for x in v]
        if pay.get(r)!=order[:3]:continue
        course_pairs=courses.get(r,[])
        verified_courses=len(course_pairs)==6 and len({boat for boat,_ in course_pairs})==6 and {course for _,course in course_pairs}==set(range(1,7))
        valid[r]={'finishOrder':order,'racerIds':{boat:ident for _,boat,ident in v},'entryCourseByBoat':dict(course_pairs) if verified_courses else None,'entryCourseVerified':verified_courses,'winningMethod':methods.get(r),'winningMethodVerified':methods.get(r) in K_METHODS}
    return valid
def join(b,k,date,venue,incident_evidence=None):
    if not re.fullmatch(r'20\d{6}',date) or not 1<=venue<=24:raise ValueError('invalid date/venue')
    out=[];rejected=[];rejection_details=[]
    incident_evidence=incident_evidence or {}
    for r in sorted(set(b)|set(k)):
        if r not in b or r not in k or any(k[r]['racerIds'].get(x['boat'])!=x['racerId'] for x in b[r]):
            reason = ('missing_valid_program' if r not in b else
                      'missing_valid_result' if r not in k else 'racer_id_mismatch')
            rejected.append(r)
            raw_evidence=incident_evidence.get(r,[])
            # Cross-check the boat's registered racer against the B program before
            # treating an incident row as verified race-specific evidence.
            program_ids={x['boat']:x['racerId'] for x in b.get(r,[])}
            evidence=[item for item in raw_evidence
                      if program_ids.get(item['boat']) == item['racerId']]
            unverified_evidence=[item for item in raw_evidence if item not in evidence]
            rejection_details.append({'race':r,'reason':reason,
                'incidentStatus':'program_identity_verified' if evidence else 'unverified',
                'incidentEvidence':evidence,
                'unverifiedIncidentEvidence':unverified_evidence})
            continue
        out.append({'date':date,'venue':venue,'race':r,'racers':b[r],'finishOrder':k[r]['finishOrder'],
          'entryCourseByBoat':k[r].get('entryCourseByBoat'),'entryCourseVerified':k[r].get('entryCourseVerified',False),
          'winningMethod':k[r].get('winningMethod'),'winningMethodVerified':k[r].get('winningMethodVerified',False),
          'resultVerified':True,'historicalProgramSource':'official_B_archive',
          'historicalResultSource':'official_K_archive','asOfVerified':False,
          'capturedBeforeStart':False,'eligibleForWeightCalibration':False})
    return {'records':out,'rejectedRaces':rejected,'rejectionDetails':rejection_details,'matchedRaces':len(out),'warning':'B file program metrics are not yet independently verified as pre-race snapshots. Do not optimize/deploy weights.'}
def main():
    p=argparse.ArgumentParser();p.add_argument('--b',required=True);p.add_argument('--k',required=True);p.add_argument('--date',required=True);p.add_argument('--venue',type=int,required=True);p.add_argument('--output',required=True)
    a=p.parse_args()
    b=Path(a.b).read_text(encoding='cp932');k=Path(a.k).read_text(encoding='cp932')
    b=venue_section(b,a.venue,'B');k=venue_section(k,a.venue,'K')
    result=join(parse_b(b),parse_k(k),a.date,a.venue,parse_k_incident_evidence(k))
    dest=Path(a.output);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'matchedRaces':result['matchedRaces'],'rejectedRaces':result['rejectedRaces'],'weightCalibrationReady':False},ensure_ascii=False))
if __name__=='__main__':main()
