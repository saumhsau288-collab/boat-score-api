#!/usr/bin/env python3
"""Offline comparison of immutable pre-race predictions to official results.

Never reconstruct predictions from a finished race or change live scoring.
"""
import argparse
import json
from pathlib import Path
from datetime import datetime, date, timezone, timedelta

REQUIRED_PROVENANCE = ('capturedBeforeStart', 'asOfVerified')
JST = timezone(timedelta(hours=9))


def has_verifiable_snapshot(pred):
    """Flags alone cannot establish that a prediction existed before the race."""
    if not all(pred.get(field) is True for field in REQUIRED_PROVENANCE):
        return False
    if not isinstance(pred.get('predictionModelVersion'), str) or not pred['predictionModelVersion'].strip():
        return False
    if not isinstance(pred.get('captureEvidenceId'), str) or not pred['captureEvidenceId'].strip():
        return False
    if not isinstance(pred.get('date'), str) or len(pred['date']) != 8 or not pred['date'].isdigit():
        return False
    try:
        captured = datetime.fromisoformat(pred['capturedAt'])
        started = datetime.fromisoformat(pred['raceStartAt'])
        race_day = date.fromisoformat(pred['date'][:4] + '-' + pred['date'][4:6] + '-' + pred['date'][6:])
    except (KeyError, TypeError, ValueError):
        return False
    if captured.tzinfo is None or started.tzinfo is None:
        return False
    if started.astimezone(JST).date() != race_day:
        return False
    return captured < started



def valid_trifecta(pick):
    return (isinstance(pick, list) and len(pick) == 3
            and all(type(v) is int and 1 <= v <= 6 for v in pick)
            and len(set(pick)) == 3)


def valid_six_picks(picks):
    return (isinstance(picks, list) and len(picks) == 6
            and all(valid_trifecta(pick) for pick in picks)
            and len({tuple(pick) for pick in picks}) == 6)


def compare(predictions, official_reports):
    official = {}
    incidents = set()
    unresolved = set()
    for report in official_reports:
        date = report['date']
        summaries = report['venueSummary']
        venue_reports = report['reports']
        if len(summaries) != len(venue_reports):
            raise ValueError('Official venue summary/report length mismatch: ' + str(date))
        for venue, venue_report in zip(summaries, venue_reports):
            number = venue['venue']
            if venue_report.get('venue') is not None and venue_report['venue'] != number:
                raise ValueError('Official venue identity mismatch: ' + str(date))
            if len(venue_report['records']) != venue['matchedRaces']:
                raise ValueError('Official matched race count mismatch: ' + str(date))
            for race in venue_report['records']:
                key = (date, number, race['race'])
                if race.get('date') != date or race.get('venue') != number:
                    raise ValueError('Official race identity mismatch: ' + str(key))
                if race.get('resultVerified') is not True:
                    raise ValueError('Unverified official race: ' + str(key))
                order = race.get('finishOrder')
                if (not isinstance(order, list) or len(order) != 6
                        or any(type(boat) is not int for boat in order)
                        or sorted(order) != list(range(1, 7))):
                    raise ValueError('Invalid official finish order: ' + str(key))
                if key in official:
                    raise ValueError('Duplicate official race: ' + str(key))
                official[key] = race
            for item in venue.get('rejectionDetails', []):
                key = (date, number, item['race'])
                if item.get('incidentStatus') == 'program_identity_verified' and item.get('incidentEvidence'):
                    incidents.add(key)
                else:
                    unresolved.add(key)
            for race_number in venue.get('rejectedRaces', []):
                key = (date, number, race_number)
                if key not in incidents:
                    unresolved.add(key)
            if any((date, number, n) in official for n in venue.get('rejectedRaces', [])):
                raise ValueError('Official race both matched and rejected: ' + str(date))
    seen = set()
    details = []
    totals = {'predictionRecords': 0, 'eligibleCompared': 0,
              'unverifiedPredictionSnapshot': 0, 'verifiedIncidentExcluded': 0,
              'unresolvedOfficialExcluded': 0, 'officialResultMissing': 0,
              'invalidPredictionExcluded': 0, 'topPickWins': 0,
              'exactTrifectaHits': 0,
              'sixPickCompared': 0, 'mainSixHits': 0, 'upsetSixHits': 0,
              'eitherSixHits': 0}
    for pred in predictions:
        key = (pred.get('date'), pred.get('venue'), pred.get('race'))
        if key in seen:
            raise ValueError('Duplicate prediction: ' + str(key))
        seen.add(key)
        totals['predictionRecords'] += 1
        if not has_verifiable_snapshot(pred):
            status = 'unverifiedPredictionSnapshot'
        elif key in incidents:
            status = 'verifiedIncidentExcluded'
        elif key in unresolved:
            status = 'unresolvedOfficialExcluded'
        elif key not in official:
            status = 'officialResultMissing'
        else:
            pick = pred.get('predictedFinishOrder')
            main = pred.get('mainSix')
            upset = pred.get('upsetSix')
            six_mode = main is not None or upset is not None
            if six_mode and (not valid_six_picks(main) or not valid_six_picks(upset)):
                status = 'invalidPredictionExcluded'
            elif not six_mode and not valid_trifecta(pick):
                status = 'invalidPredictionExcluded'
            else:
                status = 'eligibleCompared'
                order = official[key]['finishOrder']
                actual = order[:3]
                if six_mode:
                    totals['sixPickCompared'] += 1
                    main_hit = actual in main
                    upset_hit = actual in upset
                    totals['mainSixHits'] += int(main_hit)
                    totals['upsetSixHits'] += int(upset_hit)
                    totals['eitherSixHits'] += int(main_hit or upset_hit)
                else:
                    totals['topPickWins'] += int(pick[0] == order[0])
                    totals['exactTrifectaHits'] += int(pick == actual)
        totals[status] += 1
        details.append({'date': key[0], 'venue': key[1], 'race': key[2], 'status': status})
    eligible = totals['eligibleCompared']
    six = totals['sixPickCompared']
    single = eligible - six
    return {'totals': totals,
            'topPickWinRatePercent': round(100 * totals['topPickWins'] / single, 2) if single else None,
            'exactTrifectaHitRatePercent': round(100 * totals['exactTrifectaHits'] / single, 2) if single else None,
            'mainSixHitRatePercent': round(100 * totals['mainSixHits'] / six, 2) if six else None,
            'upsetSixHitRatePercent': round(100 * totals['upsetSixHits'] / six, 2) if six else None,
            'eitherSixHitRatePercent': round(100 * totals['eitherSixHits'] / six, 2) if six else None,
            'details': details,
            'warning': 'Compare only stored predictions with independently verified pre-race capture; no retroactive reconstruction. Incident and unresolved races are excluded, not counted as misses.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--predictions', required=True)
    parser.add_argument('--official-reports', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    predictions = json.loads(Path(args.predictions).read_text(encoding='utf-8'))
    if not isinstance(predictions, list):
        raise ValueError('Predictions must be a JSON list')
    reports = [json.loads(p.read_text(encoding='utf-8')) for p in sorted(Path(args.official_reports).glob('*.json'))]
    if not reports:
        raise ValueError('No official daily reports')
    result = compare(predictions, reports)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'details'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
