#!/usr/bin/env python3
"""Inspect prediction snapshot evidence before offline accuracy analysis.

A self-declared timestamp or ID does not establish immutable provenance.
"""
import argparse
import json
from collections import Counter
from pathlib import Path
from compare_offline_predictions import has_verifiable_snapshot, valid_six_picks


def audit(predictions):
    reasons = Counter()
    details = []
    ids = set()
    for item in predictions:
        key = [item.get('date'), item.get('venue'), item.get('race')]
        evidence = item.get('captureEvidenceId')
        if not has_verifiable_snapshot(item):
            status = 'snapshot_metadata_invalid'
        elif evidence in ids:
            status = 'duplicate_evidence_id'
        elif not valid_six_picks(item.get('mainSix')) or not valid_six_picks(item.get('upsetSix')):
            status = 'six_plus_six_picks_invalid'
        else:
            status = 'metadata_passes_authenticity_unverified'
        if isinstance(evidence, str):
            ids.add(evidence)
        reasons[status] += 1
        details.append({'date': key[0], 'venue': key[1], 'race': key[2], 'status': status})
    return {'records': len(predictions), 'statusCounts': dict(reasons),
            'independentlyAuthenticatedSnapshots': 0, 'details': details,
            'warning': 'Metadata-only validation cannot establish a trusted pre-race capture. Confirm an external immutable archive commit and server-side capture timestamp before using accuracy metrics.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--predictions', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    records = json.loads(Path(args.predictions).read_text(encoding='utf-8'))
    if not isinstance(records, list):
        raise ValueError('Predictions must be a JSON list')
    report = audit(records)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'details'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
