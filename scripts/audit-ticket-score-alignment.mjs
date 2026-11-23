// Research-only: compare archived twelve ticket structure with archived score ranks.
// Descriptive agreement only; no outcome, hit-rate or source provenance inference.
const validTicket=t=>Array.isArray(t)&&t.length===3&&t.every(x=>Number.isInteger(x)&&x>=1&&x<=6)&&new Set(t).size===3;
export function auditTicketScoreAlignment(archives){
 const out={ready:0,eligible:0,excluded:0,exclusionReasons:{},firstPlaceScoreRank:{},mainFirstPlaceTopScore:0,upsetFirstPlaceTopScore:0,mainTickets:0,upsetTickets:0,uniqueTicketsPerRace:{},warning:'Score-rank alignment is descriptive, not evidence of accuracy or pre-race provenance. No race results were used.'};
 const exclude=reason=>{out.excluded++;out.exclusionReasons[reason]=(out.exclusionReasons[reason]??0)+1;};
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  const p=r?.response;if(p?.ready!==true)continue;out.ready++;
  const scores=p.rankedScores;
  if(!Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x?.boat)).size!==6||!scores.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.score))){exclude('invalid_ranked_scores');continue;}
  if(!Array.isArray(p.main)||p.main.length!==6||!Array.isArray(p.upset)||p.upset.length!==6){exclude('missing_twelve_tickets');continue;}
  const tickets=[...p.main,...p.upset];
  const normalize=x=>Array.isArray(x)?x:x?.ticket;
  if(!tickets.every(x=>validTicket(normalize(x)))){exclude('invalid_ticket_shape');continue;}
  const sorted=scores.slice().sort((x,y)=>y.score-x.score||x.boat-y.boat);
  const rank=new Map(sorted.map((x,i)=>[x.boat,i+1]));
  const distinct=new Set(tickets.map(x=>normalize(x).join('-'))).size;
  out.uniqueTicketsPerRace[distinct]=(out.uniqueTicketsPerRace[distinct]??0)+1;
  for(let i=0;i<tickets.length;i++){
   const first=normalize(tickets[i])[0],k=String(rank.get(first));
   out.firstPlaceScoreRank[k]=(out.firstPlaceScoreRank[k]??0)+1;
   if(i<6){out.mainTickets++;if(rank.get(first)===1)out.mainFirstPlaceTopScore++;}
   else {out.upsetTickets++;if(rank.get(first)===1)out.upsetFirstPlaceTopScore++;}
  }
  out.eligible++;
 }
 return out;
}
