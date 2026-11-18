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


def archived_quality_summary(directory):
    days = []
    for file in sorted(Path(directory).glob('*.json')):
        report = json.loads(file.read_text(encoding='utf-8'))
        summaries = report.get('venueSummary')
        if not isinstance(summaries, list) or not summaries:
            raise ValueError('Missing venue quality summary: ' + file.name)
        matched = sum(v['matchedRaces'] for v in summaries)
        rejected = sum(len(v['rejectedRaces']) for v in summaries)
        reason_counts = {}
        incident_counts = {}
        incident_evidence_races = 0
        incident_unverified_races = 0
        for venue in summaries:
            details = venue.get('rejectionDetails', [])
            if details:
                if len(details) != len(venue['rejectedRaces']):
                    raise ValueError('Rejection detail count mismatch: ' + file.name)
                if sorted(item['race'] for item in details) != sorted(venue['rejectedRaces']):
                    raise ValueError('Rejection detail race mismatch: ' + file.name)
                for item in details:
                    reason = item['reason']
                    if reason not in ('missing_valid_program', 'missing_valid_result', 'racer_id_mismatch'):
                        raise ValueError('Unknown rejection reason: ' + str(reason))
                    reason_counts[reason] = reason_counts.get(reason, 0) + 1
                    evidence = item.get('incidentEvidence', [])
                    if evidence:
                        incident_evidence_races += 1
                        if item.get('incidentStatus') != 'program_identity_verified':
                            raise ValueError('Incident evidence lacks program identity verification: ' + file.name)
                        for event in evidence:
                            kind = event['kind']
                            incident_counts[kind] = incident_counts.get(kind, 0) + 1
                    elif item.get('unverifiedIncidentEvidence'):
                        incident_unverified_races += 1
            else:
                reason_counts['legacy_unclassified'] = reason_counts.get('legacy_unclassified', 0) + len(venue['rejectedRaces'])
        verified = sum(len(v['records']) for v in report['reports'])
        if matched != verified:
            raise ValueError('Verified race count mismatch: ' + file.name)
        days.append({'date': file.stem, 'verifiedRaces': matched,
                     'rejectedRaces': rejected, 'rejectionReasons': reason_counts,
                     'identityVerifiedIncidentRaces': incident_evidence_races,
                     'incidentEvidenceCounts': incident_counts,
                     'unverifiedIncidentEvidenceRaces': incident_unverified_races,
                     'venuesWithNoVerifiedRaces': [v['venue'] for v in summaries if v['matchedRaces'] == 0]})
    totals = {}
    incident_totals = {}
    for day in days:
        for kind, count in day['incidentEvidenceCounts'].items():
            incident_totals[kind] = incident_totals.get(kind, 0) + count
    for day in days:
        for reason, count in day['rejectionReasons'].items():
            totals[reason] = totals.get(reason, 0) + count
    return {'days': days, 'rejectionReasons': totals,
            'identityVerifiedIncidentRaces': sum(d['identityVerifiedIncidentRaces'] for d in days),
            'incidentEvidenceCounts': incident_totals,
            'unverifiedIncidentEvidenceRaces': sum(d['unverifiedIncidentEvidenceRaces'] for d in days),
            'totalVerifiedRaces': sum(d['verifiedRaces'] for d in days),
            'totalRejectedRaces': sum(d['rejectedRaces'] for d in days),
            'warning': 'Rejected races are excluded, not treated as non-events; archived sample may be biased'}


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
    result['archiveDataQuality'] = archived_quality_summary(args.archive)
    if result['archiveDataQuality']['totalVerifiedRaces'] != result['raceCount']:
        raise ValueError('Archived quality and analyzed race counts differ')
    result['historicalArchiveWarning'] = 'Offline historical observations; no verified pre-race snapshots; never deploy live weights based on this report'
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'archivedDayFiles': days, 'raceCount': result['raceCount'], 'uniqueRacers': result['uniqueRacers'], 'racersMeetingTechniqueSampleThreshold': result['racersMeetingTechniqueSampleThreshold'], 'archiveDateCoverage': result['archiveDateCoverage'], 'totalRejectedRaces': result['archiveDataQuality']['totalRejectedRaces']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
