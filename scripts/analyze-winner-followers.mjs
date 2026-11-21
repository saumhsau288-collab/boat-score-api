// Research-only: count actual 2nd/3rd finishes conditional on the winner.
// Input: JSON array of {finishOrder:[boat1,...,boat6], ...optional pre-race fields}.
import fs from 'node:fs';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/analyze-winner-followers.mjs verified-results.json');process.exit(2)}
const loaded=JSON.parse(fs.readFileSync(path,'utf8'));
const records=Array.isArray(loaded)?loaded:Array.isArray(loaded?.results)?loaded.results:null;
if(!records)throw Error('Expected array or object with results array');
const totals=Object.fromEntries([1,2,3,4,5,6].map(n=>[n,{races:0,second:{},third:{},podium:{}}]));
let excluded=0;
for(const record of records){
 const order=record?.verified===false?null:record?.finishOrder;
 if(!Array.isArray(order)||order.length!==6||new Set(order).size!==6||!order.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue}
 const [winner,second,third]=order, row=totals[winner];row.races++;
 row.second[second]=(row.second[second]||0)+1;
 row.third[third]=(row.third[third]||0)+1;
 for(const boat of [second,third])row.podium[boat]=(row.podium[boat]||0)+1;
}
const output={valid:records.length-excluded,excluded,byWinner:{}};
for(let winner=1;winner<=6;winner++){
 const row=totals[winner],denom=row.races;
 output.byWinner[winner]={races:denom,sampleStatus:denom>=30?'descriptive_sample_30_plus':'insufficient_sample_do_not_adjust_weights',followers:Object.fromEntries([1,2,3,4,5,6].filter(n=>n!==winner).map(n=>[n,{second:row.second[n]||0,third:row.third[n]||0,secondOrThird:(row.podium[n]||0),secondRate:denom?(row.second[n]||0)/denom:null,podiumRate:denom?(row.podium[n]||0)/denom:null}]))};
}
console.log(JSON.stringify(output,null,2));
