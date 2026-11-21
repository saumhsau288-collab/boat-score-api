// Conditional finish-order transition matrix. Retrospective only.
export function auditFinishOrderPairs(records) {
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const matrix=Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{
  races:0,second:Object.fromEntries([1,2,3,4,5,6].map(x=>[String(x),0])),
  third:Object.fromEntries([1,2,3,4,5,6].map(x=>[String(x),0]))
 }]));
 const seen=new Set();let excluded=0;
 for(const r of records) {
  const o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||
   !Number.isInteger(r?.venue)||r.venue<1||r.venue>24||
   !Number.isInteger(r?.race)||r.race<1||r.race>12||
   !Array.isArray(o)||o.length!==6||new Set(o).size!==6||
   !o.every(x=>Number.isInteger(x)&&x>=1&&x<=6)) {excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');
  if(seen.has(key))throw new Error('duplicate race '+key);
  seen.add(key);
  const b=matrix[String(o[0])];b.races++;b.second[String(o[1])]++;b.third[String(o[2])]++;
 }
 const byWinner=Object.fromEntries(Object.entries(matrix).map(([winner,b])=>[winner,{
  ...b,secondRate:Object.fromEntries(Object.entries(b.second).map(([k,n])=>[k,b.races?n/b.races:null])),
  thirdRate:Object.fromEntries(Object.entries(b.third).map(([k,n])=>[k,b.races?n/b.races:null]))
 }]));
 return {eligible:seen.size,excluded,byWinner,
  warning:'Historical winner-conditioned descriptive frequencies; winner is unknown before race. No predictive score claim.'};
}
