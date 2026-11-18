#!/usr/bin/env python3
"""Offline one-race pipeline: six racer inputs -> score uncertainty -> method evidence.
No deployed Worker calls, no accuracy claim, no live score changes.
"""
import argparse,json,subprocess,tempfile
from pathlib import Path
from combine_race_score_method_evidence import combine

def run(race,history,project_root=None):
    root=Path(project_root) if project_root else Path(__file__).resolve().parent.parent
    racers=race.get('racers')
    if not isinstance(racers,list) or len(racers)!=6:
        raise ValueError('Six racer inputs required')
    with tempfile.TemporaryDirectory() as tmp:
        input_path=Path(tmp)/'racers.json'
        input_path.write_text(json.dumps(racers,ensure_ascii=False),encoding='utf-8')
        js="""import fs from 'node:fs';
import {scoreUncertaintyBounds} from './scripts/score-uncertainty-bounds.mjs';
const racers=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
process.stdout.write(JSON.stringify(scoreUncertaintyBounds(racers)));
"""
        process=subprocess.run(['node','--input-type=module','-e',js,str(input_path)],
            cwd=root,capture_output=True,text=True,check=True,timeout=30)
    score=json.loads(process.stdout)
    if score.get('status') in ('invalid_race','invalid_inputs'):
        raise ValueError('Invalid race scoring evidence: '+score['status'])
    return combine(race,score,history)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--race',required=True);p.add_argument('--history',required=True)
    p.add_argument('--output',required=True)
    args=p.parse_args()
    report=run(json.loads(Path(args.race).read_text(encoding='utf-8')),
               json.loads(Path(args.history).read_text(encoding='utf-8')))
    output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'race':report['race'],'racerCount':len(report['racers']),
        'scoreWeightsChanged':report['scoreWeightsChanged'],
        'accuracyCalculationPermitted':report['accuracyCalculationPermitted']}))
