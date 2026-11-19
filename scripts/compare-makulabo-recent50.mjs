// Experimental Makurabo recent-50 integration. Explicit matched values only; no invented zeroes.
import {matchRecent50Racers} from '../boat-score-2-recent50-identity.js';
import {auditRecent50SourceReadiness} from './audit-recent50-source-readiness.mjs';
import {predictExperimentalRace} from '../boat-score-2-offline-prediction.js';
export function compareMakulaboRecent50(racers,recent50,{weight=10}={}){
 const baseline=predictExperimentalRace(racers);
 const identity=matchRecent50Racers(racers,recent50);
 const base={baseline,identity,applied:false,adjusted:null,reason:null};
 if(baseline.status!=='experimental')return {...base,reason:'baseline_unavailable'};
 if(!identity.verified)return {...base,reason:'makulabo_identity_unverified'};
 if(!Number.isFinite(weight)||weight<0||weight>20)return {...base,reason:'invalid_weight'};
 const evidence=auditRecent50SourceReadiness({official:racers,recent50});
 if(!evidence.readyForVerifiedSourceReview)return {...base,reason:'makulabo_source_evidence_incomplete',evidence};
 const values=identity.matches.map(m=>Number(recent50[m.recentIndex]?.winRate));
 if(values.some(v=>!Number.isFinite(v)||v<0||v>100))return {...base,reason:'makulabo_win_rate_missing_or_invalid'};
 const scoreByBoat=new Map(baseline.ranking.map(r=>[r.boat,r.score]));
 const adjusted=baseline.ranking.map(r=>({...r,score:Number(((1-weight/100)*scoreByBoat.get(r.boat)+weight/100*values[identity.matches.findIndex(m=>m.boat===r.boat)]).toFixed(3))})).sort((a,b)=>b.score-a.score||a.boat-b.boat);
 const all=[];for(const a of adjusted)for(const b of adjusted)for(const c of adjusted)if(a.boat!==b.boat&&a.boat!==c.boat&&b.boat!==c.boat)all.push({boats:[a.boat,b.boat,c.boat],ticket:[a.boat,b.boat,c.boat].join('-'),heuristic:Number((a.score*.5+b.score*.3+c.score*.2).toFixed(2))});
 all.sort((a,b)=>b.heuristic-a.heuristic||a.ticket.localeCompare(b.ticket));
 const favorite=adjusted[0].boat;
 return {...base,applied:true,reason:null,weight,adjusted:{ranking:adjusted,main:all.filter(x=>x.boats[0]===favorite).slice(0,6),upset:all.filter(x=>x.boats[0]!==favorite).slice(0,6)},warning:'Makulabo values must be independently sourced and mapped; score is a research-only scenario, not calibrated.'};
}
