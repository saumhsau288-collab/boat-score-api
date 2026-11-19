// Bundle the isolated mobile selector into the Worker so "/" always serves the UI.
// Do not modify or deploy the original Boat Score worker.
import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('../research/boat-score-2-race-selector.html',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../research/boat-score-2-preview-worker.mjs',import.meta.url),'utf8');
const marker=" if(u.pathname!=='/api/predict')return reply({status:'not_found'},404);";
if(!worker.includes(marker))throw Error('Preview API route marker missing; refusing to generate bundle');
if(!html.includes('id="select"')||!html.includes('new URL(location.origin)'))throw Error('Expected same-origin mobile selector not found');
const homepage=" if(u.pathname==='/'||u.pathname==='/index.html')return new Response(BOAT_SCORE_LAB_HTML,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});";
const bundle='const BOAT_SCORE_LAB_HTML='+JSON.stringify(html)+';\n'+worker.replace(marker,homepage+'\n'+marker);
const out=path.join(new URL('../',import.meta.url).pathname,'dist/boat-score-2-predict-lab.mjs');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,bundle,'utf8');
console.log('Generated standalone isolated Worker with embedded selector: '+out);
