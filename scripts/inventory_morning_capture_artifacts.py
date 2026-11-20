#!/usr/bin/env python3
"""Read-only GitHub Actions artifact inventory; never treats raw responses as verified forecasts."""
import io
import json
import os
import re
import sys
import urllib.request
import urllib.parse
import zipfile
from collections import Counter, defaultdict


def summarize_capture(payload):
    if not isinstance(payload, dict) or payload.get('authenticatedBeforeRace') is not False:
        raise ValueError('Expected unauthenticated raw capture')
    records = payload.get('records')
    if not isinstance(records, list):
        raise ValueError('Missing capture records')
    counts = {'captured': len(records), 'http200': 0, 'ready': 0, 'usableSixPlusSix': 0, 'readyWithoutSixBoatInputs': 0,
              'readyWithoutAuthenticatedPreRaceEvidence': 0}
    def six(picks):
        return (isinstance(picks, list) and len(picks) == 6
                and all(isinstance(p, list) and len(p) == 3
                        and all(type(n) is int and 1 <= n <= 6 for n in p)
                        and len(set(p)) == 3 for p in picks)
                and len({tuple(p) for p in picks}) == 6)
    for row in records:
        if not isinstance(row, dict):
            raise ValueError('Invalid capture row')
        if row.get('httpStatus') == 200:
            counts['http200'] += 1
            response = row.get('response')
            if isinstance(response, dict) and response.get('ready') is True:
                counts['ready'] += 1
                if not (isinstance(response.get('scoreInputsByBoat'), list)
                        and len(response['scoreInputsByBoat']) == 6):
                    counts['readyWithoutSixBoatInputs'] += 1
                if not (payload.get('authenticatedBeforeRace') is True
                        and row.get('authenticatedBeforeRace') is True):
                    counts['readyWithoutAuthenticatedPreRaceEvidence'] += 1
                if six(response.get('main')) and six(response.get('upset')):
                    counts['usableSixPlusSix'] += 1
    return counts


class SafeArtifactRedirect(urllib.request.HTTPRedirectHandler):
    """Do not send GitHub API credentials to a signed artifact storage URL."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected is None:
            return None
        old_host = urllib.parse.urlsplit(req.full_url).hostname
        new_host = urllib.parse.urlsplit(newurl).hostname
        if old_host != new_host:
            for header in list(redirected.headers):
                if header.lower() in ('authorization', 'x-github-api-version'):
                    del redirected.headers[header]
        return redirected



def diagnose_capture(payload):
    """Aggregate response states without exposing or reconstructing individual predictions."""
    if not isinstance(payload, dict) or payload.get('authenticatedBeforeRace') is not False:
        raise ValueError('Expected unauthenticated raw capture')
    records = payload.get('records')
    if not isinstance(records, list):
        raise ValueError('Missing capture records')
    states = Counter()
    venues = defaultdict(Counter)
    ready_races = []
    not_ready_shapes = Counter()
    transport_causes = Counter()
    missing_input_shapes = Counter()
    verification_flags = Counter()
    missing_input_lengths = Counter()
    retry_types = Counter()
    verification_pairs = Counter()
    reason_types = Counter()
    retry_categories = Counter()
    explicit_http_statuses = Counter()
    for row in records:
        if not isinstance(row, dict):
            raise ValueError('Invalid capture row')
        venue, race = row.get('venue'), row.get('race')
        if type(venue) is not int or not 1 <= venue <= 24 or type(race) is not int or not 1 <= race <= 12:
            raise ValueError('Invalid captured venue/race identity')
        response = row.get('response')
        status = row.get('httpStatus')
        if response is not None and not isinstance(response, dict):
            state = 'unexpected_response_shape'
        elif status != 200:
            state = 'http_' + str(status) if type(status) is int else 'transport_error'
        elif response is None:
            state = 'http200_non_json'
        elif response.get('ready') is True:
            state = 'ready'
            ready_races.append({'venue': venue, 'race': race})
        elif response.get('ready') is False:
            state = 'not_ready'
        else:
            state = 'ready_missing_or_invalid'
        if state == 'not_ready':
            # Report only response field names, not potentially sensitive values.
            shape = ','.join(sorted(str(k) for k in response if isinstance(k, str)))[:300]
            not_ready_shapes[shape or '(empty object)'] += 1
            missing = response.get('missingInputs')
            # Report only structure, never raw source values.
            if isinstance(missing, dict):
                missing_shape = 'object:' + ','.join(sorted(k for k in missing if isinstance(k, str)))[:200]
            elif isinstance(missing, list):
                missing_shape = 'list'
                missing_input_lengths[str(len(missing))] += 1
            elif missing is None:
                missing_shape = 'null'
            else:
                missing_shape = 'other'
            missing_input_shapes[missing_shape] += 1
            reason = response.get('reason')
            reason_types[('missing' if reason is None else 'string' if isinstance(reason, str)
                          else 'object' if isinstance(reason, dict) else 'other')] += 1
            retry = response.get('officialStatsRetry')
            # Fixed categories only; never output free-form upstream retry messages.
            retry_text = retry.strip().lower() if isinstance(retry, str) else ''
            if isinstance(retry, str):
                retry_category = ('empty' if not retry_text else
                                  'timeout' if 'timeout' in retry_text or 'timed out' in retry_text else
                                  'http_error' if 'http' in retry_text or 'status' in retry_text else
                                  'other_string')
                retry_categories[retry_category] += 1
                # Only extract a code when it is explicitly labeled as HTTP/status.
                match = re.search(r'\b(?:http(?:\s+status)?|status(?:\s+code)?)\s*[:= -]?\s*([45][0-9]{2})\b', retry_text)
                explicit_http_statuses[match.group(1) if match else 'not_explicit'] += 1
            retry_types[('null' if retry is None else 'boolean' if type(retry) is bool
                         else 'string' if isinstance(retry, str) else 'object' if isinstance(retry, dict)
                         else 'list' if isinstance(retry, list) else 'number' if type(retry) in (int, float)
                         else 'other')] += 1
            official = response.get('officialVerified')
            stats = response.get('statsVerified')
            pair = ('both_true' if official is True and stats is True
                    else 'both_false' if official is False and stats is False
                    else 'mixed_or_unknown')
            verification_pairs[pair] += 1
            for field in ('officialVerified', 'statsVerified', 'officialStatsRetry'):
                value = response.get(field)
                state_name = 'true' if value is True else 'false' if value is False else 'other'
                verification_flags[field + ':' + state_name] += 1
        elif state == 'transport_error':
            message = str(row.get('error') or '').lower()
            cause = ('timeout' if 'timeout' in message or 'timed out' in message
                     else 'network' if any(t in message for t in ('fetch failed', 'network', 'econn', 'enotfound'))
                     else 'other')
            transport_causes[cause] += 1
        states[state] += 1
        venues[str(venue)][state] += 1
    return {'states': dict(sorted(states.items())),
            'byVenue': {v: dict(sorted(c.items())) for v, c in sorted(venues.items(), key=lambda x: int(x[0]))},
            'readyRaceIdentities': ready_races,
            'notReadyResponseFieldSets': dict(sorted(not_ready_shapes.items())),
            'transportErrorCategories': dict(sorted(transport_causes.items())),
            'missingInputStructures': dict(sorted(missing_input_shapes.items())),
            'verificationFlagCounts': dict(sorted(verification_flags.items())),
            'missingInputListLengths': dict(sorted(missing_input_lengths.items(), key=lambda x: int(x[0]))),
            'officialStatsRetryTypes': dict(sorted(retry_types.items())),
            'verificationPairs': dict(sorted(verification_pairs.items())),
            'notReadyReasonTypes': dict(sorted(reason_types.items())),
            'officialRetryCategories': dict(sorted(retry_categories.items())),
            'explicitRetryHttpStatuses': dict(sorted(explicit_http_statuses.items()))}

def api(path, token, binary=False):
    request = urllib.request.Request(
        'https://api.github.com/' + path.lstrip('/'),
        headers={'Authorization': 'Bearer ' + token,
                 'Accept': 'application/vnd.github+json',
                 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.build_opener(SafeArtifactRedirect()).open(request, timeout=30) as response:
        data = response.read()
    return data if binary else json.loads(data)


def inventory(repository, token):
    totals = defaultdict(lambda: {'artifacts': 0, 'captured': 0,
                                  'http200': 0, 'ready': 0, 'usableSixPlusSix': 0,
                                  'readyWithoutSixBoatInputs': 0,
                                  'readyWithoutAuthenticatedPreRaceEvidence': 0})
    errors = []
    inspected = 0
    diagnostics = defaultdict(lambda: {'states': Counter(), 'byVenue': defaultdict(Counter), 'readyRaceIdentities': [], 'notReadyResponseFieldSets': Counter(), 'transportErrorCategories': Counter(), 'missingInputStructures': Counter(), 'verificationFlagCounts': Counter(), 'missingInputListLengths': Counter(), 'officialStatsRetryTypes': Counter(), 'verificationPairs': Counter(), 'notReadyReasonTypes': Counter(), 'officialRetryCategories': Counter(), 'explicitRetryHttpStatuses': Counter()})
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
                                 and re.fullmatch(r'20[0-9]{6}-[0-9]+\.json', n.rsplit('/', 1)[-1])]
                    if len(raw_files) != 1:
                        raise ValueError('Expected one raw capture JSON per artifact')
                    payload = json.loads(archive.read(raw_files[0]))
                    date = payload.get('date')
                    if not isinstance(date, str) or len(date) != 8 or not date.isdigit():
                        raise ValueError('Invalid capture date')
                    counts = summarize_capture(payload)
                    diagnostic = diagnose_capture(payload)
                    bucket = diagnostics[date]
                    bucket['states'].update(diagnostic['states'])
                    for venue, state_counts in diagnostic['byVenue'].items():
                        bucket['byVenue'][venue].update(state_counts)
                    bucket['readyRaceIdentities'].extend(diagnostic['readyRaceIdentities'])
                    bucket['notReadyResponseFieldSets'].update(diagnostic['notReadyResponseFieldSets'])
                    bucket['transportErrorCategories'].update(diagnostic['transportErrorCategories'])
                    bucket['missingInputStructures'].update(diagnostic['missingInputStructures'])
                    bucket['verificationFlagCounts'].update(diagnostic['verificationFlagCounts'])
                    bucket['missingInputListLengths'].update(diagnostic['missingInputListLengths'])
                    bucket['officialStatsRetryTypes'].update(diagnostic['officialStatsRetryTypes'])
                    bucket['verificationPairs'].update(diagnostic['verificationPairs'])
                    bucket['notReadyReasonTypes'].update(diagnostic['notReadyReasonTypes'])
                    bucket['officialRetryCategories'].update(diagnostic['officialRetryCategories'])
                    bucket['explicitRetryHttpStatuses'].update(diagnostic['explicitRetryHttpStatuses'])
                    totals[date]['artifacts'] += 1
                    for key, value in counts.items():
                        totals[date][key] += value
            except (ValueError, KeyError, OSError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
                errors.append({'artifactId': artifact.get('id'), 'reason': str(exc)})
        if len(artifacts) < 100:
            break
    # De-duplicate ready race identities across multiple archived runs per date.
    # This is still raw-response evidence, never authenticated pre-race evidence.
    unique_ready = {}
    for day, bucket in diagnostics.items():
        ids = [(row['venue'], row['race']) for row in bucket['readyRaceIdentities']]
        unique_ready[day] = {'uniqueReadyRaceKeys': len(set(ids)),
                             'duplicateReadyAttempts': len(ids) - len(set(ids))}
    diagnostic_output = {}
    for day, bucket in sorted(diagnostics.items()):
        diagnostic_output[day] = {
            **unique_ready[day],
            'states': dict(sorted(bucket['states'].items())),
            'byVenue': {venue: dict(sorted(c.items()))
                        for venue, c in sorted(bucket['byVenue'].items(), key=lambda x: int(x[0]))},
            'readyRaceIdentities': bucket['readyRaceIdentities'],
            'notReadyResponseFieldSets': dict(sorted(bucket['notReadyResponseFieldSets'].items())),
            'transportErrorCategories': dict(sorted(bucket['transportErrorCategories'].items())),
            'missingInputStructures': dict(sorted(bucket['missingInputStructures'].items())),
            'verificationFlagCounts': dict(sorted(bucket['verificationFlagCounts'].items())),
            'missingInputListLengths': dict(sorted(bucket['missingInputListLengths'].items(), key=lambda x: int(x[0]))),
            'officialStatsRetryTypes': dict(sorted(bucket['officialStatsRetryTypes'].items())),
            'verificationPairs': dict(sorted(bucket['verificationPairs'].items())),
            'notReadyReasonTypes': dict(sorted(bucket['notReadyReasonTypes'].items())),
            'officialRetryCategories': dict(sorted(bucket['officialRetryCategories'].items())),
            'explicitRetryHttpStatuses': dict(sorted(bucket['explicitRetryHttpStatuses'].items()))}
    return {'byCaptureDate': dict(sorted(totals.items())),
            'diagnosticsByDate': diagnostic_output, 'artifactsInspected': inspected,
            'errors': errors, 'officialResultOverlap': None,
            'accuracyCalculationPermitted': False,
            'warning': 'Counts of stored raw API responses, NOT authenticated pre-race predictions. Duplicate attempts may be counted. No official result join or hit-rate calculation.'}


if __name__ == '__main__':
    repository = os.environ.get('GITHUB_REPOSITORY')
    token = os.environ.get('GH_TOKEN')
    if not repository or not token:
        sys.exit('GITHUB_REPOSITORY and GH_TOKEN required')
    result = inventory(repository, token)
    if result['errors']:
        print('ERROR: Some retained artifacts could not be read; counts are incomplete', file=sys.stderr)
    # Put the most actionable, privacy-safe totals at the top for mobile log viewers.
    for day, diagnostic in result['diagnosticsByDate'].items():
        print('DIAGNOSTIC_SUMMARY ' + json.dumps({
            'date': day,
            'states': diagnostic['states'],
            'notReadyReasonTypes': diagnostic['notReadyReasonTypes'],
            'officialRetryCategories': diagnostic['officialRetryCategories'],
            'explicitRetryHttpStatuses': diagnostic['explicitRetryHttpStatuses'],
            'verificationPairs': diagnostic['verificationPairs'],
            'transportErrorCategories': diagnostic['transportErrorCategories'],
        }, ensure_ascii=False, sort_keys=True), flush=True)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write('## Stored Boat Score 2 morning raw captures\n\n')
            f.write('| Date JST | Artifacts | Attempts | HTTP 200 | Ready | Unique ready races | Duplicate ready attempts | Missing six-boat vectors | Unauthenticated ready |\n')
            f.write('|---|---:|---:|---:|---:|---:|---:|---:|---:|\n')
            for day, counts in result['byCaptureDate'].items():
                d = result['diagnosticsByDate'][day]
                f.write(f"| {day} | {counts['artifacts']} | {counts['captured']} | {counts['http200']} | {counts['ready']} | {d['uniqueReadyRaceKeys']} | {d['duplicateReadyAttempts']} | {counts['readyWithoutSixBoatInputs']} | {counts['readyWithoutAuthenticatedPreRaceEvidence']} |\n")
            f.write('\nUnique ready races are raw (date, venue, race) keys, NOT authenticated pre-race predictions. No accuracy claims.\n')
            for day, diagnostic in result['diagnosticsByDate'].items():
                f.write(f'\n### {day}: response diagnostics\n\n')
                f.write('| Response state | Count |\n|---|---:|\n')
                for state, count in diagnostic['states'].items():
                    f.write(f'| {state} | {count} |\n')
                f.write('\nReady venue/race IDs (not verified pre-race predictions): ')
                f.write(', '.join(f"{r['venue']}-{r['race']}" for r in diagnostic['readyRaceIdentities']) or 'none')
                f.write('\n\nNot-ready response field sets (field names only):\n')
                for fields, count in diagnostic['notReadyResponseFieldSets'].items():
                    f.write(f'- {fields}: {count}\n')
                f.write('\nMissing input structures (no values):\n')
                for shape, count in diagnostic['missingInputStructures'].items():
                    f.write(f'- {shape}: {count}\n')
                f.write('\nVerification flags:\n')
                for flag, count in diagnostic['verificationFlagCounts'].items():
                    f.write(f'- {flag}: {count}\n')
                f.write('\nMissing input list lengths (counts only):\n')
                for length, count in diagnostic['missingInputListLengths'].items():
                    f.write(f'- {length} missing inputs: {count}\n')
                f.write('\nOfficial/statistics verification pairs:\n')
                for pair, count in diagnostic['verificationPairs'].items():
                    f.write(f'- {pair}: {count}\n')
                f.write('\nNot-ready reason value types:\n')
                for kind, count in diagnostic['notReadyReasonTypes'].items():
                    f.write(f'- {kind}: {count}\n')
                f.write('\nOfficial retry failure categories (no raw messages):\n')
                for category, count in diagnostic['officialRetryCategories'].items():
                    f.write(f'- {category}: {count}\n')
                f.write('\nExplicit HTTP status codes in retry messages (not independently verified):\n')
                for status, count in diagnostic['explicitRetryHttpStatuses'].items():
                    f.write(f'- {status}: {count}\n')
                f.write('\nOfficial retry types (no values):\n')
                for kind, count in diagnostic['officialStatsRetryTypes'].items():
                    f.write(f'- {kind}: {count}\n')
                f.write('\nTransport error categories:\n')
                for category, count in diagnostic['transportErrorCategories'].items():
                    f.write(f'- {category}: {count}\n')
            f.write('\nRaw captures are not authenticated forecasts; no accuracy metrics.\n')
            if result['errors']:
                f.write(f"\nUnreadable artifacts: {len(result['errors'])} (inspect job log).\n")
    if result['errors']:
        sys.exit(1)
