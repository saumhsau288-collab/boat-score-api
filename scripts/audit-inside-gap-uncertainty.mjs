// Wilson 95% interval for binomial proportions; descriptive uncertainty, not predictive accuracy.
export function wilson95(hits,total){
 if(!Number.isInteger(hits)||!Number.isInteger(total)||total<0||hits<0||hits>total)throw new RangeError('invalid count');
 if(total===0)return {rate:null,lower:null,upper:null};
 const z=1.959963984540054,p=hits/total,z2=z*z,den=1+z2/total;
 const mid=(p+z2/(2*total))/den;
 const half=z*Math.sqrt(p*(1-p)/total+z2/(4*total*total))/den;
 return {rate:p,lower:Math.max(0,mid-half),upper:Math.min(1,mid+half)};
}
export function auditInsideGapUncertainty(audit){
 if(!audit?.byWinner)throw new TypeError('winner-stratified audit required');
 const byWinner={};
 for(const [boat,groups] of Object.entries(audit.byWinner)){
  const g=groups.outsideAheadBy1Plus;
  if(!g||!Number.isInteger(g.races)||!Number.isInteger(g.insideSecond))throw new TypeError('invalid group');
  byWinner[boat]={insideSecond:g.insideSecond,races:g.races,...wilson95(g.insideSecond,g.races)};
 }
 return {byWinner,warning:'Wilson 95% intervals describe sampling uncertainty only; actual podium pair and winner are already known, and archive rates are not verified pre-race.'};
}
