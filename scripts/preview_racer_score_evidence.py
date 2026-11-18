#!/usr/bin/env python3
"""Read-only racer evaluation evidence. Never invent a replacement live score."""
import argparse
import json
from pathlib import Path

def preview(evidence, racer_ids):
    if evidence.get('scope') != 'OFFLINE_HISTORICAL_OBSERVATION_NOT_PREDICTION':
        raise ValueError('Expected verified offline historical evidence')
    racers = {str(row['racerId']): row for row in evidence['racerEvidence']}
    if len(set(map(str, racer_ids))) != len(racer_ids):
        raise ValueError('Duplicate racer ID')
    rows = []
    for racer_id in racer_ids:
        racer_id = str(racer_id)
        row = racers.get(racer_id)
        if row is None:
            rows.append({'racerId': racer_id, 'status': 'no_verified_history',
                         'proposedScore': None, 'scoreDelta': None})
            continue
        enough = (row['observedStarts'] >= 20 and row['observedWins'] >= 5
                  and row.get('sampleInsufficientForIndividualTechniquePreference') is False)
        national = row.get('officialNationalWinRateSamples') or []
        local = row.get('officialLocalWinRateSamples') or []
        rows.append({'racerId': racer_id,
                     'status': 'descriptive_evidence_available' if enough else 'insufficient_technique_sample',
                     'observedStarts': row['observedStarts'],
                     'observedWins': row['observedWins'],
                     'observedWinRatePercent': row['observedWinRatePercent'],
                     'nationalWinRateLatestArchivedSample': national[-1] if national else None,
                     'localWinRateLatestArchivedSample': local[-1] if local else None,
                     'winningMethods': row['winningMethods'] if enough else None,
                     'winningMethodSharesOfWinsPercent': row.get('winningMethodSharesOfWinsPercent') if enough else None,
                     'entryCourses': row['entryCourses'] if enough else None,
                     'proposedScore': None, 'scoreDelta': None})
    return {'mode': 'OFFLINE_SCORE_EVIDENCE_PREVIEW_ONLY',
            'existingLiveScorePreserved': True, 'weightsChanged': False,
            'racerCount': len(rows), 'racersWithDescriptiveTechniqueEvidence': sum(r['status']=='descriptive_evidence_available' for r in rows),
            'racers': rows,
            'warning': 'Archived rates are not guaranteed pre-race snapshots. No model scores, ranking, backtest accuracy, or weight changes are computed. Technique shares require >=20 starts and >=5 wins.'}

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--evidence', required=True)
    p.add_argument('--racer-ids', nargs='+', required=True)
    p.add_argument('--output', required=True)
    a = p.parse_args()
    result = preview(json.loads(Path(a.evidence).read_text(encoding='utf-8')), a.racer_ids)
    target = Path(a.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'racerCount': result['racerCount'], 'racersWithDescriptiveTechniqueEvidence': result['racersWithDescriptiveTechniqueEvidence'], 'weightsChanged': False}))

if __name__ == '__main__':
    main()
