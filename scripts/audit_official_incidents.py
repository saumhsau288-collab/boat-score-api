#!/usr/bin/env python3
"""Audit confirmed incident-row evidence separately from unverified rejected races."""
import argparse
import collections
import json
from pathlib import Path


def audit_reports(reports):
    totals = collections.Counter()
    by_kind = collections.Counter()
    by_day = []
    for path in sorted(Path(reports).glob('*.json')):
        data = json.loads(path.read_text(encoding='utf-8'))
        day = collections.Counter()
        day_kinds = collections.Counter()
        for venue in data.get('venueSummary', []):
            rejected = venue.get('rejectedRaces', [])
            details = venue.get('rejectionDetails', [])
            if details and sorted(d['race'] for d in details) != sorted(rejected):
                raise ValueError('Rejected race details mismatch: ' + path.name)
            day['rejectedRaces'] += len(rejected)
            if not details:
                day['unclassifiedLegacyRaces'] += len(rejected)
                continue
            for detail in details:
                evidence = detail.get('incidentEvidence', [])
                if evidence:
                    if detail.get('incidentStatus') != 'program_identity_verified':
                        raise ValueError('Incident evidence is not identity verified: ' + path.name)
                    day['identityVerifiedIncidentRaces'] += 1
                    for row in evidence:
                        day_kinds[row['kind']] += 1
                else:
                    day['noVerifiedIncidentEvidenceRaces'] += 1
                if detail.get('unverifiedIncidentEvidence'):
                    day['unverifiedIncidentEvidenceRaces'] += 1
        if day['identityVerifiedIncidentRaces'] + day['noVerifiedIncidentEvidenceRaces'] + day['unclassifiedLegacyRaces'] != day['rejectedRaces']:
            raise ValueError('Incident audit coverage mismatch: ' + path.name)
        totals.update(day)
        by_kind.update(day_kinds)
        by_day.append({'date': path.stem, **dict(day), 'incidentKinds': dict(day_kinds)})
    if not by_day:
        raise ValueError('No daily reports')
    return {'days': by_day, 'totals': dict(totals), 'incidentKinds': dict(by_kind),
            'refundVerified': False,
            'warning': 'Incident rows are not proof of refunds. Missing K results are not presumed incidents. Retrospective evidence only; not pre-race evaluation.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reports', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    result = audit_reports(args.reports)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'totals': result['totals'], 'incidentKinds': result['incidentKinds']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
