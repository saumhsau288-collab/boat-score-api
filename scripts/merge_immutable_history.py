#!/usr/bin/env python3
"""Safely merge verified daily research reports without mutating archived originals."""
import argparse
import json
from pathlib import Path


def merge_reports(incoming_dir, archive_dir):
    incoming = sorted(Path(incoming_dir).glob('*.json'))
    if not incoming:
        raise ValueError('No incoming daily reports')
    archive = Path(archive_dir)
    archive.mkdir(parents=True, exist_ok=True)
    summary = {'added': [], 'identical': [], 'conflictingPreserved': []}
    for source in incoming:
        day = source.stem
        if len(day) != 8 or not day.isdigit():
            raise ValueError('Invalid report filename: ' + source.name)
        report = json.loads(source.read_text(encoding='utf-8'))
        if not isinstance(report.get('reports'), list) or not report['reports']:
            raise ValueError('Empty incoming report: ' + source.name)
        destination = archive / source.name
        if destination.exists():
            # The original report is immutable, even when parsing changes later.
            if destination.read_bytes() == source.read_bytes():
                summary['identical'].append(source.name)
            else:
                summary['conflictingPreserved'].append(source.name)
            continue
        destination.write_bytes(source.read_bytes())
        summary['added'].append(source.name)
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--incoming', required=True)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--summary', required=True)
    args = parser.parse_args()
    summary = merge_reports(args.incoming, args.archive)
    output = Path(args.summary)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False))
    for name in summary['conflictingPreserved']:
        print('WARNING: Existing immutable report preserved despite changed reparse:', name)


if __name__ == '__main__':
    main()
