// Research-only analysis of saved retrospective replay artifacts.
// Usage: node scripts/report-exclusion-strata.mjs replay1.json [replay2.json ...]
// Do not interpret reconstructed historical scores as pre-race accuracy.
import fs from 'node:fs';
const paths=process.argv.slice(2);
if(!paths.length)throw Error('Provide at least one retrospective-exclusion JSON file');
const methods=['baseline_no_exclusion','multi_winner_top2_1','multi_winner_two_1','multi_winner_two_no_neighbor_1','multi_winner_three_no_neighbor_1'];
const rows=[],seen=new Set();
for(const path of paths){
 const data=JSON.parse(fs.readFileSync(path,'utf8'));
 if(data.mode!=='retrospective_current_app_diagnostic_not_pre_race_validation')throw Error('Unexpected replay mode: '+path);
 const byKey=new Map(data.retrospectiveDiagnostic.detail.map(x=>[x.key,x]));
 for(const e of data.evidence){
  const key=[e.date,e.venue,e.race].join(':');
  if(seen.has(key))throw Error('Duplicate race: '+key);
  seen.add(key);
  const detail=byKey.get(key);
  if(!detail||e.boats.length!==6)throw Error('Missing evidence: '+key);
  const scores=e.boats.map(x=>Number(x.score)).sort((a,b)=>b-a);
  rows.push({key,venue:e.venue,gapTop1Top3:scores[0]-scores[2],cases:detail.cases});
 }
}
const group=(name,items)=>({name,races:items.length,methods:Object.fromEntries(methods.map(m=>{
 const evaluated=items.filter(x=>x.cases[m]?.status==='evaluated');
 return [m,{eligible:evaluated.length,hits:evaluated.filter(x=>x.cases[m].trifectaSixHit).length}];
}))});
const venues=[...new Set(rows.map(x=>x.venue))].sort((a,b)=>a-b);
const output={mode:'retrospective_diagnostic_only',totalRaces:rows.length,
 note:'Score gaps and venue groups are descriptive, not prospective model selection evidence. Do not optimize thresholds on these same races.',
 groups:[group('all',rows),...venues.map(v=>group('venue_'+v,rows.filter(x=>x.venue===v))),
 group('score_gap_top1_top3_below_15',rows.filter(x=>x.gapTop1Top3<15)),
 group('score_gap_top1_top3_at_least_15',rows.filter(x=>x.gapTop1Top3>=15))]};
console.log(JSON.stringify(output,null,2));
