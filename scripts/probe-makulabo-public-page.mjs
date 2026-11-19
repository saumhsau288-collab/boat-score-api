// Research-only public Makulabo page readiness probe. Never bypass authentication or infer last50.
export async function probeMakulaboPublicPage({date,venue,race,fetchImpl=fetch}={}){
 if(!/^20\d{6}$/.test(String(date))||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return {status:'invalid_selection'};
 const url=`https://makulabo-jp.com/data/${String(venue).padStart(2,'0')}/${race}/heatmap?hd=${date}`;
 try{
  const res=await fetchImpl(url,{redirect:'follow',headers:{accept:'text/html'},signal:AbortSignal.timeout(12000)});
  if(!res.ok)return {status:'http_error',httpStatus:res.status,url,recent50Ready:false};
  const type=res.headers.get('content-type')??'';
  if(!/text\/html/i.test(type))return {status:'unexpected_content_type',url,recent50Ready:false};
  const html=await res.text();
  if(html.length>1500000)return {status:'page_too_large',url,recent50Ready:false};
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  const indicators={hasHeatmap:/ヒートマップ/.test(text),hasLast50Label:/直近\s*50\s*走|過去\s*50\s*走|50走/.test(text),hasLoginPrompt:/ログイン|会員登録|有料会員|新規登録/.test(text),hasRacerRegistrationId:/\b[3-5]\d{3}\b/.test(text),htmlBytes:html.length};
  return {status:'public_page_inspected',url,recent50Ready:false,indicators,warning:'Page labels are not authenticated six-racer recent50 win rates. No values extracted or applied.'};
 }catch(e){return {status:'fetch_failed',url,recent50Ready:false,error:String(e.message).slice(0,120)};}
}
