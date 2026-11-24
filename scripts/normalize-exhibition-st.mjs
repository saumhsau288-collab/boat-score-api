export function normalizeExhibitionST(raw){
 if(raw===null||raw===undefined||String(raw).trim()==='')return {status:'missing',seconds:null};
 const s=String(raw).trim().normalize('NFKC').toUpperCase();
 if(s==='L')return {status:'late',seconds:null};
 const m=s.match(/^(F)?(0?\.\d{1,3}|[01](?:\.\d{1,3})?)$/);
 if(!m)return {status:'invalid',seconds:null};
 const n=Number(m[2]);
 if(!Number.isFinite(n)||n<0||n>1)return {status:'invalid',seconds:null};
 return {status:m[1]?'flying':'normal',seconds:m[1]?-n:n};
}
