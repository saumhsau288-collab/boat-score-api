#!/usr/bin/env python3
"""Combine archived per-day verified reports for offline long-term analysis."""
import argparse
import json
from datetime import date, timedelta
from pathlib import Path
from analyze_racer_winning_methods import analyze


def load_unique_days(directory):
    files = sorted(Path(directory).glob('*.json'))
    if not files:
        raise ValueError('No daily reports found')
    records = []
    seen = set()
    for file in files:
        day = file.stem
        if len(day) != 8 or not day.isdigit():
            raise ValueError('Invalid report filename: ' + file.name)
        report = json.loads(file.read_text(encoding='utf-8'))
        if not isinstance(report.get('reports'), list) or not report['reports']:
            raise ValueError('Empty daily report: ' + file.name)
        for venue_report in report['reports']:
            for race in venue_report.get('records', []):
                if str(race.get('date')) != day:
                    raise ValueError('Date mismatch: ' + file.name)
                key = (race['date'], race['venue'], race['race'])
                if key in seen:
                    raise ValueError('Duplicate archived race: ' + str(key))
                seen.add(key)
                records.append(race)
    if not records:
        raise ValueError('No verified races')
    return records, len(files)


def archive_date_coverage(directory):
    dates = []
    for file in sorted(Path(directory).glob('*.json')):
        try:
            day = date.fromisoformat(file.stem[:4] + '-' + file.stem[4:6] + '-' + file.stem[6:])
        except ValueError as exc:
            raise ValueError('Invalid archive date: ' + file.name) from exc
        dates.append(day)
    if not dates:
        raise ValueError('No archived days')
    existing = set(dates)
    missing = []
    day = dates[0]
    while day <= dates[-1]:
        if day not in existing:
            missing.append(day.isoformat())
        day += timedelta(days=1)
    return {'firstArchivedDate': dates[0].isoformat(),
            'lastArchivedDate': dates[-1].isoformat(),
            'archivedDayCount': len(dates),
            'missingCalendarDates': missing,
            'hasDateGaps': bool(missing)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    records, days = load_unique_days(args.archive)
    result = analyze([{'records': records}])
    result['archivedDayFiles'] = days
    result['archiveDateCoverage'] = archive_date_coverage(args.archive)
    result['historicalArchiveWarning'] = 'Offline historical observations; no verified pre-race snapshots; never deploy live weights based on this report'
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'archivedDayFiles': days, 'raceCount': result['raceCount'], 'uniqueRacers': result['uniqueRacers'], 'racersMeetingTechniqueSampleThreshold': result['racersMeetingTechniqueSampleThreshold']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
