#!/usr/bin/env node
// Research-only: compare two official parsers on previously captured raw HTML files.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {compareOfficialSixParsers} from './compare-official-six-parsers.mjs';
const files=process.argv.slice(2);
if(!files.length){console.error('Usage: node scripts/compare-saved-official-html-parsers.mjs file1.html [file2.html...]');process.exit(2);}
const results=files.map(file=>{
 const raw=fs.readFileSync(file);
 if(raw.length>2_000_000)throw Error('Official HTML too large: '+file);
 const compared=compareOfficialSixParsers(raw.toString('utf8'));
 return {file,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex'),...compared};
});
console.log(JSON.stringify({files:results.length,bothParsersAgree:results.filter(x=>x.identityAgreement).length,
 manualReview:results.filter(x=>x.needsManualReview).length,results,
 warning:'This checks only saved HTML structure; it does not prove pre-race source timing or original predictor input use.'},null,2));
