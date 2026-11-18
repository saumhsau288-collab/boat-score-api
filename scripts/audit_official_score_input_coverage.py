#!/usr/bin/env python3
"""Audit availability of five independent scoring inputs in official archived B/K reports."""
import argparse
import json
from pathlib import Path

FIELDS = ('nationalWinRate', 'localWinRate', 'motorTwoWinRate', 'recent50WinRate', 'exhibitionScore')
LIMITS = (10, 10, 100, 100, 100)

def audit(data):
    rows = data['records'] if isinstance(data, dict) and 'records' in data else [
        race for venue in data['reports'] for race in venue['records']]
    counts = {key: 0 for key in FIELDS}
    total = 0
    complete = 0
    blocked = 0
    for race in rows:
        if race.get('resultVerified') is not True or race.get('capturedBeforeStart') is not False or race.get('asOfVerified') is not False:
            raise ValueError('Unexpected official archive provenance or result verification')
        racers = race['racers']
        if len(racers) != 6 or {r['boat'] for r in racers} != set(range(1, 7)):
            raise ValueError('Invalid six-boat race')
        total += 1
        all_complete = True
        for racer in racers:
            for key, maximum in zip(FIELDS, LIMITS):
                value = racer.get(key)
                valid = type(value) in (int, float) and 0 <= value <= maximum
                counts[key] += int(valid)
                all_complete = all_complete and valid
        complete += int(all_complete)
        blocked += int(not all_complete)
    return {'scope': 'OFFICIAL_ARCHIVE_SCORING_INPUT_COVERAGE_ONLY',
            'verifiedRaceRows': total, 'racerRows': total * 6,
            'validRacerInputCounts': counts,
            'completeFiveInputRaces': complete,
            'blockedFiveInputRaces': blocked,
            'preRaceAuthenticatedRaces': 0,
            'weightCalibrationPermitted': False,
            'liveScoreChangesPermitted': False,
            'warning': 'Archived B/K records are not authenticated pre-race snapshots. Missing recent50/exhibition are not zero. This report does not evaluate or alter deployed Boat Score 2.'}

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True)
    p.add_argument('--output', required=True)
    a = p.parse_args()
    result = audit(json.loads(Path(a.input).read_text(encoding='utf-8')))
    target = Path(a.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
