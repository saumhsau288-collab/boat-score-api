// Research only. Compare SAVED original tickets against a spatial proxy on exactly matching authenticated races.
// Spatial feature snapshots require independent provenance review; never fill missing features from post-race records.
import {compareSavedCaptureWithVerifiedResults} from './compare-saved-capture-results.mjs';
import {rankTickets} from './compare-spatial-hypothesis.mjs';
const key=r=>[r?.date,Number(r?.venue),Number(r?.race)].join(':');
const validRacers=a=>Array.isArray(a)&&a.length===6&&new Set(a.map(x=>x.boat)).size===6&&a.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score)&&Number.isFinite(x.avgStart)&&x.avgStart>=0&&x.avgStart<=.4);
const time=s=>typeof s==='string'&&/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)?Date.parse(s):NaN;
export function compareSavedTicketsToSpatial(capture,officialResults,snapshots){
 const original=compareSavedCaptureWithVerifiedResults(capture,officialResults);
 const byKey=new Map(),counts=new Map();
 for(const s of Array.isArray(snapshots)?snapshots:[]){const k=key(s);counts.set(k,(counts.get(k)||0)+1);byKey.set(k,s);}
 const saved=new Map((Array.isArray(capture?.records)?capture.records:[]).map(r=>[key(r),r]));
 const officialByKey=new Map((Array.isArray(officialResults)?officialResults:[]).map(r=>[key(r),r]));
 const rows=[],holdReasons={};let mainHits=0,upsetHits=0,anyHits=0,baselineMainHits=0,baselineUpsetHits=0,baselineAnyHits=0;
 for(const r of original.rows){
  if(r.status!=='compared'){rows.push({key:key(r),status:'held',reasons:r.reasons});continue;}
  const k=key(r),s=byKey.get(k),savedRace=saved.get(k),snapshotAt=time(s?.snapshotAt),receivedAt=time(savedRace?.receivedAt),officialCutoffAt=time(officialByKey.get(k)?.officialCutoffAt);
  const reasons=[];
  if(counts.get(k)!==1)reasons.push('missing_or_duplicate_spatial_snapshot');
  if(!validRacers(s?.racers))reasons.push('invalid_spatial_features');
  if(s?.independentlyVerifiedPreRace!==true)reasons.push('spatial_snapshot_provenance_unverified');
  if(s?.date!==savedRace?.date||Number(s?.venue)!==Number(savedRace?.venue)||Number(s?.race)!==Number(savedRace?.race))reasons.push('spatial_snapshot_race_identity_mismatch');
  if(!Number.isFinite(snapshotAt)||!Number.isFinite(receivedAt)||snapshotAt>receivedAt)reasons.push('spatial_snapshot_not_before_saved_prediction');
  if(!Number.isFinite(officialCutoffAt)||!Number.isFinite(snapshotAt)||snapshotAt>=officialCutoffAt)reasons.push('spatial_snapshot_not_before_official_cutoff');
  if(reasons.length){for(const reason of reasons)holdReasons[reason]=(holdReasons[reason]||0)+1;rows.push({key:k,status:'held',reasons});continue;}
  const actual=r.actual,spatial=rankTickets(s.racers,true);
  const hit=a=>a.some(t=>t.join('-')===actual);
  const mainHit=hit(spatial.main),upsetHit=hit(spatial.upset);
  mainHits+=Number(mainHit);upsetHits+=Number(upsetHit);anyHits+=Number(mainHit||upsetHit);
  baselineMainHits+=Number(r.mainHit);baselineUpsetHits+=Number(r.upsetHit);baselineAnyHits+=Number(r.mainHit||r.upsetHit);
  const originalMain=savedRace.response.main,originalUpset=savedRace.response.upset;
  const asKeys=tickets=>tickets.map(t=>t.join('-'));
  const originalKeys=new Set([...asKeys(originalMain),...asKeys(originalUpset)]);
  const spatialKeys=new Set([...asKeys(spatial.main),...asKeys(spatial.upset)]);
  const overlap=[...originalKeys].filter(t=>spatialKeys.has(t)).length;
  rows.push({key:k,status:'compared',actual,baseline:{mainHit:r.mainHit,upsetHit:r.upsetHit,mainTickets:asKeys(originalMain),upsetTickets:asKeys(originalUpset)},spatial:{mainHit,upsetHit,mainTickets:asKeys(spatial.main),upsetTickets:asKeys(spatial.upset)},ticketOverlap:overlap});
 }
 const compared=rows.filter(x=>x.status==='compared').length;
 const rate=n=>compared?Number((100*n/compared).toFixed(2)):null;
 return {status:compared?'paired_research_comparison':'insufficient_authenticated_paired_races',compared,held:rows.length-compared,holdReasons,baseline:{mainHits:baselineMainHits,upsetHits:baselineUpsetHits,anyHits:baselineAnyHits,mainRatePercent:rate(baselineMainHits),upsetRatePercent:rate(baselineUpsetHits),anyRatePercent:rate(baselineAnyHits)},spatial:{mainHits,upsetHits,anyHits,mainRatePercent:rate(mainHits),upsetRatePercent:rate(upsetHits),anyRatePercent:rate(anyHits)},deltaAnyPercentagePoints:compared?rate(anyHits)-rate(baselineAnyHits):null,rows,warning:'Requires independently verified pre-race spatial snapshots. A caller-supplied flag is not itself provenance proof. Spatial proxy is not a physical 2D simulator.'};
}
