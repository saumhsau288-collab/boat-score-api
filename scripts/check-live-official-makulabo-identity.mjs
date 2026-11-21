// Research-only: verify identity between live official six and Makulabo six.
// Never score or deploy based on this inspection.
import {officialRacelistUrl} from '../boat-score-2-official.js';
import {extractOfficialMetrics} from '../boat-score-2-metric-extractor.js';
import {parseMakulaboHeatmapSix} from './parse-makulabo-heatmap-six.mjs';
import {matchRecent50Racers} from '../boat-score-2-recent50-identity.js';
import {evaluateMorningFromSources} from '../boat-score-2-morning-pipeline.js';
const [date,venue,race]=process.argv.slice(2);
const selection={date,venue,race};
const officialTarget=officialRacelistUrl(selection);
if(officialTarget.status!=='ok')throw Error('Invalid selection');
const makulaboUrl='https://makulabo-jp.com/data/'+venue.padStart(2,'0')+'/'+Number(race)+'/heatmap?hd='+date;
async function html(url){
 const res=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error('HTTP '+res.status+' for '+new URL(url).host);
 const body=await res.text();
 if(body.length>2_000_000)throw Error('Response too large');
 return body;
}
const official=extractOfficialMetrics(await html(officialTarget.url));
const makulabo=parseMakulaboHeatmapSix(await html(makulaboUrl));
if(!official.verified||!makulabo.verified)throw Error('Both sources must parse six racers');
const matched=matchRecent50Racers(official.racers,makulabo.racers);
const summary={selection,officialVerified:official.verified,makulaboStructureVerified:makulabo.verified,
 identityVerified:matched.verified,reason:matched.reason??null,
 matches:matched.matches.map(m=>({boat:m.boat,status:m.status,method:m.method??null,reason:m.reason??null})),
 official:official.racers.map(r=>({boat:r.boat,racerId:r.racerId,name:r.name})),
 makulabo:makulabo.racers.map(r=>({boat:r.boat,name:r.name,runs:r.runs,firstPlaceRate:r.firstPlaceRate})),
 eligibleForMorningScoring:false};
console.log('OFFICIAL_MAKULABO_IDENTITY',JSON.stringify(summary));
if(!matched.verified)throw Error('Six racer identities could not be verified');
for(const match of matched.matches){
 const recent=makulabo.racers[match.recentIndex];
 if(recent.boat!==match.boat)throw Error('Heatmap boat mismatch for boat '+match.boat);
}
const joined=matched.matches.map(match=>{
 const officialRacer=official.racers.find(r=>r.boat===match.boat);
 const recent=makulabo.racers[match.recentIndex];
 return {boat:match.boat,racerId:officialRacer.racerId,name:officialRacer.name,
  observedRuns:recent.runs,observedFirstPlaceRate:recent.firstPlaceRate,
  blankAsZeroInferred:recent.blankAsZeroInferred,
  verified:false,sourceVerified:false,
  eligibleForMorningScoring:false};
});
console.log('OFFICIAL_MAKULABO_JOINED_RESEARCH',JSON.stringify(joined));
const gated=evaluateMorningFromSources({official:official.racers,
 recent50:joined.map(r=>({racerId:r.racerId,winRate:r.observedFirstPlaceRate,
 verified:r.verified,sourceVerified:r.sourceVerified}))});
if(gated.status!=='insufficient_data'||gated.source!=='recent50')
 throw Error('Research-only Makulabo values incorrectly passed morning score gate');
console.log('RECENT50_SCORE_GATE_BLOCKED',JSON.stringify({status:gated.status,source:gated.source,reason:gated.reason}));
console.log('SIX_BOAT_IDENTITY_VERIFIED_NO_SCORING');
