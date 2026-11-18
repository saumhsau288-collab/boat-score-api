#!/usr/bin/env python3
"""Read-only GitHub Actions artifact inventory; never treats raw responses as verified forecasts."""
import io
import json
import os
import sys
import urllib.request
import zipfile
from collections import defaultdict


def summarize_capture(payload):
    if not isinstance(payload, dict) or payload.get('authenticatedBeforeRace') is not False:
        raise ValueError('Expected unauthenticated raw capture')
    records = payload.get('records')
    if not isinstance(records, list):
        raise ValueError('Missing capture records')
    counts = {'captured': len(records), 'http200': 0, 'ready': 0, 'usableSixPlusSix': 0}
    def six(picks):
        return (isinstance(picks, list) and len(picks) == 6
                and all(isinstance(p, list) and len(p) == 3
                        and all(type(n) is int and 1 <= n <= 6 for n in p)
                        and len(set(p)) == 3 for p in picks)
                and len({tuple(p) for p in picks}) == 6)
    for row in records:
        if row.get('httpStatus') == 200:
            counts['http200'] += 1
            response = row.get('response')
            if isinstance(response, dict) and response.get('ready') is True:
                counts['ready'] += 1
                if six(response.get('main')) and six(response.get('upset')):
                    counts['usableSixPlusSix'] += 1
    return counts


def api(path, token, binary=False):
    request = urllib.request.Request(
        'https://api.github.com/' + path.lstrip('/'),
        headers={'Authorization': 'Bearer ' + token,
                 'Accept': 'application/vnd.github+json',
                 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
    return data if binary else json.loads(data)


def inventory(repository, token):
    totals = defaultdict(lambda: {'artifacts': 0, 'captured': 0,
                                  'http200': 0, 'ready': 0, 'usableSixPlusSix': 0})
    errors = []
    inspected = 0
    for page in range(1, 11):
        response = api(f'repos/{repository}/actions/artifacts?per_page=100&page={page}', token)
        artifacts = response.get('artifacts', [])
        for artifact in artifacts:
            name = artifact.get('name', '')
            if not name.startswith('boat-score-2-morning-raw-') or artifact.get('expired'):
                continue
            inspected += 1
            try:
                data = api(f'repos/{repository}/actions/artifacts/{artifact["id"]}/zip', token, binary=True)
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    raw_files = [n for n in archive.namelist()
                                 if (n.startswith('prediction-captures/') or '/' not in n)
                                 and n.endswith('.json')
                                 and not n.endswith(('-quality.json', '-score-inputs.json',
                                                     '-response-shape.json'))]
                    if len(raw_files) != 1:
                        raise ValueError('Expected one raw capture JSON per artifact')
                    payload = json.loads(archive.read(raw_files[0]))
                    date = payload.get('date')
                    if not isinstance(date, str) or len(date) != 8 or not date.isdigit():
                        raise ValueError('Invalid capture date')
                    counts = summarize_capture(payload)
                    totals[date]['artifacts'] += 1
                    for key, value in counts.items():
                        totals[date][key] += value
            except (ValueError, KeyError, OSError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
                errors.append({'artifactId': artifact.get('id'), 'reason': str(exc)})
        if len(artifacts) < 100:
            break
    return {'byCaptureDate': dict(sorted(totals.items())), 'artifactsInspected': inspected,
            'errors': errors, 'officialResultOverlap': None,
            'accuracyCalculationPermitted': False,
            'warning': 'Counts of stored raw API responses, NOT authenticated pre-race predictions. Duplicate attempts may be counted. No official result join or hit-rate calculation.'}


if __name__ == '__main__':
    repository = os.environ.get('GITHUB_REPOSITORY')
    token = os.environ.get('GH_TOKEN')
    if not repository or not token:
        sys.exit('GITHUB_REPOSITORY and GH_TOKEN required')
    result = inventory(repository, token)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write('## Stored Boat Score 2 morning raw captures\\n\\n')
            f.write('| Date JST | Artifacts | Attempts | HTTP 200 | Ready | 6+6 format |\\n')
            f.write('|---|---:|---:|---:|---:|---:|\\n')
            for day, c in result['byCaptureDate'].items():
                f.write(f"| {day} | {c['artifacts']} | {c['captured']} | {c['http200']} | {c['ready']} | {c['usableSixPlusSix']} |\\n")
            f.write('\\nRaw captures are not authenticated forecasts; no accuracy metrics.\\n')
            if result['errors']:
                f.write(f"\\nUnreadable artifacts: {len(result['errors'])} (inspect job log).\\n")
