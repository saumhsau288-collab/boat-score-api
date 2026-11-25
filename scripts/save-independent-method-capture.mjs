// Research-only, explicit local CLI. Never called by deployed application.
// node scripts/save-independent-method-capture.mjs snapshot.json capture.json predictedAt writtenAt
// Stores immutable raw inputs and the generated twelve method decisions together.
// Does not claim independently authenticated timing, sources or official cutoff.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {prepareIndependentMethodPrediction} from './prepare-independent-method-prediction.mjs';
export function createIndependentMethodCapture(snapshot,timing){
 const prediction=prepareIndependentMethodPrediction(snapshot,timing);
 return {schemaVersion:'research-twelve-capture-v0',snapshot:structuredClone(snapshot),prediction,
  sourceAuthentication:{status:'unverified',officialCutoffVerified:false,officialResultVerified:false},
  immutableResearchOnly:true,
  warning:'Saving a file is not proof of pre-race capture. Requires independently verifiable source timestamps, official cutoff and results.'};
}
export async function saveIndependentMethodCapture(snapshotPath,outputPath,timing){
 if(typeof snapshotPath!=='string'||!snapshotPath||typeof outputPath!=='string'||!outputPath)throw Error('explicit input/output paths required');
 if(resolve(snapshotPath)===resolve(outputPath))throw Error('cannot overwrite source snapshot');
 const snapshot=JSON.parse(await readFile(snapshotPath,'utf8'));
 const capture=createIndependentMethodCapture(snapshot,timing);
 await writeFile(outputPath,JSON.stringify(capture,null,2)+'\n',{flag:'wx',mode:0o600});
 return {outputPath,methodCount:Object.keys(capture.prediction.methods).length,
  predicted:Object.values(capture.prediction.methods).filter(x=>Array.isArray(x.trifecta)).length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output,predictedAt,writtenAt]=process.argv.slice(2);
 saveIndependentMethodCapture(input,output,{predictedAt,writtenAt}).then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
