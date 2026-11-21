// Check readiness for prospective validation without inferring pre-race status.
export function auditProspectiveReadiness(records){
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const counts={total:records.length,verifiedResult:0,hasSixRacers:0,hasSixNationalRates:0,verifiedPreRaceRates:0,hasSixAverageStarts:0,verifiedPreRaceStarts:0,fullyReady:0};
 for(const r of records){
  const racers=Array.isArray(r?.racers)?r.racers:[];
  const result=r?.resultVerified===true;
  const six=racers.length===6&&new Set(racers.map(x=>x?.boat)).size===6;
  const rates=six&&racers.every(x=>Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0);
  const starts=six&&racers.every(x=>Number.isFinite(x?.averageStartTiming)&&x.averageStartTiming>=0);
  const preRates=r?.asOfVerified===true&&r?.capturedBeforeStart===true&&rates;
  const preStarts=r?.startTimingAsOfVerified===true&&r?.capturedBeforeStart===true&&starts;
  if(result)counts.verifiedResult++;
  if(six)counts.hasSixRacers++;
  if(rates)counts.hasSixNationalRates++;
  if(preRates)counts.verifiedPreRaceRates++;
  if(starts)counts.hasSixAverageStarts++;
  if(preStarts)counts.verifiedPreRaceStarts++;
  if(result&&preRates&&preStarts)counts.fullyReady++;
 }
 return {...counts,warning:'Pre-race fields must be explicitly verified; never infer timestamps from archive dates.'};
}
