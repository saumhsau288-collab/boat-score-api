// Offline comparison of six-racer score rankings. Not the deployed Boat Score 2 model.
import fs from 'node:fs';
import {compareScoreVariants} from './compare-score-variants.mjs';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/preview-score-race-ranking.mjs <input.json>');process.exit(2);}
const input=JSON.parse(fs.readFileSync(file,'utf8'));
const rows=Array.isArray(input)?input:[input];
const results=rows.map(row=>{
 const compare=compareScoreVariants(row.racers,row.candidateWeights);
 const rank=field=>compare.status==='comparison_ready'
  ? [...compare.rows].sort((a,b)=>b[field]-a[field]||a.boat-b.boat).map(r=>r.boat):null;
 const baselineRank=rank('baselineScore'),candidateRank=rank('candidateScore');
 return {date:row.date??null,venue:row.venue??null,race:row.race??null,
  ...compare,baselineRank,candidateRank,
  rankingChanged:baselineRank&&candidateRank?baselineRank.join(',')!==candidateRank.join(','):null,
  actualResultCompared:false,independentPreRaceEvidenceVerified:false};
});
const summary={scope:'OFFLINE_HYPOTHETICAL_RANKING_COMPARISON',races:results.length,
 comparisonsReady:results.filter(x=>x.status==='comparison_ready').length,
 rankingChanged:results.filter(x=>x.rankingChanged===true).length,
 productionChanged:false,
 warning:'Input data must be separately authenticated as pre-race before any performance claim. These rankings do not validate winning methods or live Boat Score 2 tickets.',
 results};
console.log(JSON.stringify(summary,null,2));
