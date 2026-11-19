// Research-only compatibility audit between existing official entry parsing and
// the evidence snapshot schema. Never upgrades parsed data to trusted capture.
export function auditOfficialEntryIntegration({racers,stats,cutoffAt,capturedAt}={}){
 const issues=[];
 if(racers?.verified!==true||!Array.isArray(racers?.racers)||racers.racers.length!==6)issues.push('six_racer_identity_parser_unverified');
 if(stats?.verified!==true||!Array.isArray(stats?.rows)||stats.rows.length!==6)issues.push('six_racer_stats_parser_unverified');
 const ids=racers?.racers??[],rows=stats?.rows??[];
 if(ids.length===6&&rows.length===6&&!rows.every(s=>ids.some(r=>r.boat===s.boat&&String(r.racerId)===String(s.racerId))))issues.push('racer_identity_mismatch');
 if(!rows.every(r=>typeof r?.nationwide?.winRate==='number'&&typeof r?.local?.winRate==='number'&&typeof r?.averageST==='number'))issues.push('win_rate_or_start_time_missing');
 if(!rows.every(r=>typeof r?.motor?.secondPlaceRate==='number'))issues.push('motor_second_place_rate_missing');
 if(!cutoffAt||!capturedAt||!Number.isFinite(Date.parse(cutoffAt))||!Number.isFinite(Date.parse(capturedAt))||Date.parse(capturedAt)>=Date.parse(cutoffAt))issues.push('verified_precutoff_capture_missing');
 return {parserCompatible:issues.filter(x=>x!=='motor_second_place_rate_missing'&&x!=='verified_precutoff_capture_missing').length===0,
  completeForFiveFactorScoring:false,storageEligible:false,issues,
  reusableFields:['racerId','boat','nationalWinRate','localWinRate','averageST'],
  needsSeparateVerification:['motorSecondPlaceRate','expectedEntryCourse','exhibitionTime','last50Score','trustedServerCapturedAt','cutoffAt'],
  warning:'Parsing existing official HTML is not evidence of pre-cutoff capture. This audit never authorizes persistence or calibration.'};
}
