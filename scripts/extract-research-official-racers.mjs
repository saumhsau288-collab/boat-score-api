// Research-only extraction of six racer records from archived official race-list HTML.
// Does not claim these post-hoc pages were available to the deployed predictor pre-race.
const clean=x=>x.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const number=x=>{const n=Number(x);return Number.isFinite(n)?n:null};
export function extractOfficialRacers(html){
 if(typeof html!=='string')throw Error('html_required');
 const rows=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 const racers=[],errors=[];
 for(const [index,m] of rows.entries()){
  const cells=[...m[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(x=>clean(x[2]));
  if(cells.length<8)continue;
  const boat={'１':1,'２':2,'３':3,'４':4,'５':5,'６':6}[cells[0]];
  if(!boat)continue;
  const identity=cells[2].match(/\b(\d{4})\s*\/\s*([AB][12])\s+(.+?)\s+[^\s/]+\s*\/\s*[^\s/]+/);
  if(!identity){errors.push('identity_unparsed_row_'+index);continue;}
  const start=cells[3].match(/\b(?:0\.\d{2}|\.\d{2})\b/);
  const national=cells[4].match(/^(\d+(?:\.\d+)?)(?:\s|$)/);
  const local=cells[5].match(/^(\d+(?:\.\d+)?)(?:\s|$)/);
  const motor=cells[6].match(/^\d+\s+(\d+(?:\.\d+)?)(?:\s|$)/);
  const racer={boat,racerId:identity[1],class:identity[2],name:identity[3].trim(),averageST:start?number(start[0]):null,nationalWinRate:national?number(national[1]):null,localWinRate:local?number(local[1]):null,motorTwoWinRate:motor?number(motor[1]):null,sourceRow:index};
  if(!racer.name||(racer.averageST!==null&&(racer.averageST<0||racer.averageST>1))||racer.nationalWinRate===null||racer.nationalWinRate>10||racer.localWinRate===null||racer.localWinRate>10||racer.motorTwoWinRate===null||racer.motorTwoWinRate>100){errors.push('invalid_values_row_'+index);continue;}
  racer.missingFields=racer.averageST===null?['averageST']:[];
  racers.push(racer);
 }
 const uniqueBoats=new Set(racers.map(x=>x.boat));
 const uniqueIds=new Set(racers.map(x=>x.racerId));
 const complete=racers.length===6&&uniqueBoats.size===6&&uniqueIds.size===6;
 if(!complete)errors.push('six_unique_racers_not_confirmed');
 return {racers:racers.sort((a,b)=>a.boat-b.boat),completeSixRacers:complete,completeSixRacerST:complete&&racers.every(x=>x.averageST!==null),authenticatedBeforeRace:false,calibrationEligible:false,errors};
}
