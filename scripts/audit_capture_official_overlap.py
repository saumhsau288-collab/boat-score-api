#!/usr/bin/env python3
"""Diagnostic coverage join only. Raw captures are NOT authenticated pre-race forecasts."""
import argparse
import json
from pathlib import Path


def audit(capture, reports):
    if capture.get('authenticatedBeforeRace') is not False:
        raise ValueError('Expected unauthenticated raw capture')
    official, incidents, unresolved = set(), set(), set()
    for day in reports:
        date = day['date']
        summaries, venues = day['venueSummary'], day['reports']
        if len(summaries) != len(venues):
            raise ValueError('Official venue count mismatch')
        for summary, venue in zip(summaries, venues):
            number = summary['venue']
            if venue.get('venue') is not None and venue['venue'] != number:
                raise ValueError('Official venue identity mismatch')
            if len(venue['records']) != summary['matchedRaces']:
                raise ValueError('Official race count mismatch')
            for record in venue['records']:
                key = (date, number, record['race'])
                if record.get('resultVerified') is not True or record.get('date') != date or record.get('venue') != number:
                    raise ValueError('Official identity/verification mismatch')
                order = record.get('finishOrder')
                if (not isinstance(order, list) or len(order) != 6
                        or any(type(boat) is not int for boat in order)
                        or sorted(order) != list(range(1, 7))):
                    raise ValueError('Invalid official finish order')
                if key in official:
                    raise ValueError('Duplicate official result')
                official.add(key)
            for item in summary.get('rejectionDetails', []):
                key = (date, number, item['race'])
                if item.get('incidentStatus') == 'program_identity_verified' and item.get('incidentEvidence'):
                    incidents.add(key)
                else:
                    unresolved.add(key)
            for race in summary.get('rejectedRaces', []):
                key = (date, number, race)
                if key not in incidents:
                    unresolved.add(key)
    totals = {'captured': 0, 'usableFormat': 0, 'officialVerifiedOverlap': 0,
              'verifiedIncidentExcluded': 0, 'unresolvedOfficialExcluded': 0,
              'officialResultMissing': 0, 'invalidOrUnavailablePrediction': 0}
    seen = set()
    for row in capture['records']:
        key = (row['date'], row['venue'], row['race'])
        if key in seen:
            raise ValueError('Duplicate captured race')
        seen.add(key)
        totals['captured'] += 1
        def six(picks):
            return (isinstance(picks, list) and len(picks) == 6
                    and all(isinstance(p, list) and len(p) == 3
                            and all(type(n) is int and 1 <= n <= 6 for n in p)
                            and len(set(p)) == 3 for p in picks)
                    and len({tuple(p) for p in picks}) == 6)
        response = row.get('response')
        if row.get('httpStatus') != 200 or not isinstance(response, dict) or response.get('ready') is not True or not six(response.get('main')) or not six(response.get('upset')):
            totals['invalidOrUnavailablePrediction'] += 1
            continue
        totals['usableFormat'] += 1
        if key in incidents:
            totals['verifiedIncidentExcluded'] += 1
        elif key in unresolved:
            totals['unresolvedOfficialExcluded'] += 1
        elif key in official:
            totals['officialVerifiedOverlap'] += 1
        else:
            totals['officialResultMissing'] += 1
    return {'totals': totals, 'authenticatedBeforeRace': False,
            'accuracyCalculationPermitted': False,
            'warning': 'Coverage and format diagnostics only; raw timestamps do not independently authenticate forecasts before race start. No hit rates or model tuning.'}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--capture', required=True)
    p.add_argument('--official-reports', nargs='+', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    capture = json.loads(Path(args.capture).read_text())
    reports = [json.loads(Path(f).read_text()) for f in args.official_reports]
    result = audit(capture, reports)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
