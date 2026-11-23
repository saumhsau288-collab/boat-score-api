// Prepare an immutable-style pre-race research snapshot for external archival.
// Caller must persist and independently authenticate the returned JSON.
// No prediction is generated and no result is attached here.
const validDate = value => {
 if(!/^20\d{6}$/.test(String(value)))return false;
 const date=String(value);
 const y=Number(date.slice(0,4)),m=Number(date.slice(4,6)),d=Number(date.slice(6,8));
 const x=new Date(Date.UTC(y,m-1,d));
 return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;
};
const japanDate = value => {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+p.month+p.day;
};
const validPick = p => Array.isArray(p) && p.length === 3 &&
  p.every(n => Number.isInteger(n) && n >= 1 && n <= 6) &&
  new Set(p).size === 3;
export function prepareTwelvePickCapture(input, capturedAt) {
  const valid = input && validDate(input.date) &&
    Number.isInteger(input.venue) && input.venue >= 1 && input.venue <= 24 &&
    Number.isInteger(input.race) && input.race >= 1 && input.race <= 12 &&
    ['main','upset'].every(k => Array.isArray(input[k]) && input[k].length === 6 &&
      input[k].every(validPick)) &&
    typeof input.cutoffAt === 'string' && Number.isFinite(Date.parse(input.cutoffAt)) &&
    typeof capturedAt === 'string' && Number.isFinite(Date.parse(capturedAt)) &&
    Date.parse(capturedAt) < Date.parse(input.cutoffAt) &&
    japanDate(capturedAt) === input.date && japanDate(input.cutoffAt) === input.date;
  if (!valid) return {status:'invalid_or_after_cutoff'};
  return {status:'prepared_not_authenticated',snapshot:{
    schemaVersion:1,date:input.date,venue:input.venue,race:input.race,
    main:input.main.map(p=>[...p]),upset:input.upset.map(p=>[...p]),
    cutoffAt:input.cutoffAt,predictionCapturedAt:capturedAt,
    preRacePredictionsSaved:false,independentlyAuthenticatedCapture:false,
    officialCutoffVerified:false,officialResultVerified:false,
    scoreInputs:input.scoreInputs??null,
    note:'Persist before cutoff. Independent evidence required before accuracy audit.'
  }};
}
