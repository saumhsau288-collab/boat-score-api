import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {evaluateLockedProspectivePredictions} from './evaluate-locked-prospective-predictions.mjs';

// Research-only offline loader. Local files alone do not prove pre-race authenticity.
export async function evaluateSavedProspectivePredictions(directory,results){
 const names=(await readdir(directory)).filter(n=>/^20\d{6}-\d{2}-\d{2}\.json$/.test(n)).sort();
 const predictions=[];
 for(const name of names){
  const body=JSON.parse(await readFile(join(directory,name),'utf8'));
  const expected=[body.date,String(body.venue).padStart(2,'0'),String(body.race).padStart(2,'0')].join('-')+'.json';
  if(name!==expected)throw new Error('prediction filename does not match race identity: '+name);
  predictions.push(body);
 }
 return {filesRead:names.length,...evaluateLockedProspectivePredictions(predictions,results)};
}
