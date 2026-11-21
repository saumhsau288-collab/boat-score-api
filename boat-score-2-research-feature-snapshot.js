// Research-only immutable-shape input record; never asserts pre-race authenticity.
import {validateOfficialMetrics} from './boat-score-2-official-metrics.js';
export function buildResearchFeatureSnapshot({date,venue,race,capturedAt,official,courseByBoat=[],recent50=[],exhibitionByBoat=[],startTimingByBoat=[]}={}){
 const dateText=String(date??'');
 const calendarDate=/^20\d{6}$/.test(dateText)?new Date(`${dateText.slice(0,4)}-${dateText.slice(4,6)}-${dateText.slice(6,8)}T00:00:00Z`):null;
 const validDate=calendarDate&&Number.isFinite(calendarDate.getTime())&&calendarDate.toISOString().slice(0,10).replaceAll('-','')===dateText;
 if(!validDate||!Number.isInteger(venue)||venue<1||venue>24||
 !Number.isInteger(race)||race<1||race>12||!Number.isFinite(Date.parse(capturedAt)))
 return {status:'invalid_capture_identity',eligibleForCalibration:false};
 const checked=validateOfficialMetrics(official);
 if(!checked.verified)return {status:'unverified_official',reason:checked.reason,eligibleForCalibration:false};
 const courses=new Map(),recent=new Map(),exhibitions=new Map(),starts=new Map();
 for(const x of startTimingByBoat){
  if(!Number.isInteger(x?.boat)||x.boat<1||x.boat>6||starts.has(x.boat))
   return {status:'invalid_start_timing_mapping',eligibleForCalibration:false};
  starts.set(x.boat,x);
 }
 for(const x of exhibitionByBoat){
  if(!Number.isInteger(x?.boat)||x.boat<1||x.boat>6||exhibitions.has(x.boat))
   return {status:'invalid_exhibition_mapping',eligibleForCalibration:false};
  exhibitions.set(x.boat,x);
 }
 for(const x of courseByBoat){
  if(!Number.isInteger(x?.boat)||x.boat<1||x.boat>6||courses.has(x.boat))
   return {status:'invalid_course_mapping',eligibleForCalibration:false};
  courses.set(x.boat,x);
 }
 for(const x of recent50){
  const id=String(x?.racerId??'');
  if(!/^\d{4}$/.test(id)||recent.has(id))return {status:'invalid_recent50_mapping',eligibleForCalibration:false};
  recent.set(id,x);
 }
 const verifiedEntryCourses=courseByBoat.filter(x=>x?.verified===true&&checked.racers.some(r=>r.boat===x.boat&&r.racerId===String(x.racerId))&&Number.isInteger(x.entryCourse)&&x.entryCourse>=1&&x.entryCourse<=6).map(x=>x.entryCourse);
 if(new Set(verifiedEntryCourses).size!==verifiedEntryCourses.length)
  return {status:'duplicate_verified_entry_course',eligibleForCalibration:false};
 const racers=checked.racers.map(r=>{
  const course=courses.get(r.boat),history=recent.get(r.racerId),exhibition=exhibitions.get(r.boat),start=starts.get(r.boat);
  const verifiedStart=start?.verified===true&&String(start.racerId)===r.racerId&&typeof start.startTiming==='number'&&Number.isFinite(start.startTiming)&&start.startTiming>=0&&start.startTiming<=1;
  const verifiedExhibition=exhibition?.verified===true&&String(exhibition.racerId)===r.racerId&&typeof exhibition.exhibitionTime==='number'&&Number.isFinite(exhibition.exhibitionTime)&&exhibition.exhibitionTime>0;
  const verifiedCourse=course?.verified===true&&String(course.racerId)===r.racerId&&Number.isInteger(course.entryCourse)&&course.entryCourse>=1&&course.entryCourse<=6;
  const verifiedRecent=history?.verified===true&&typeof history.firstPlaceRate==='number'&&Number.isFinite(history.firstPlaceRate)&&history.firstPlaceRate>=0&&history.firstPlaceRate<=100;
  return {...r,sourceVerified:true,entryCourse:verifiedCourse?course.entryCourse:null,entryCourseVerified:verifiedCourse,
   recent50FirstPlaceRate:verifiedRecent?history.firstPlaceRate:null,recent50Verified:verifiedRecent,
   startTiming:verifiedStart?start.startTiming:null,startTimingVerified:verifiedStart,
   exhibitionTime:verifiedExhibition?exhibition.exhibitionTime:null,
   exhibitionTimeVerified:verifiedExhibition,weather:null};
 });
 const missing=['independently_verified_official_cutoff','independently_verified_official_result','pre_race_source_authentication'];
 if(!racers.every(r=>r.startTimingVerified))missing.push('start_timing');
 if(!racers.every(r=>r.exhibitionTimeVerified))missing.push('exhibition');
 missing.push('weather');
 return {status:'captured_research_inputs',date,venue,race,capturedAt,
  source:'verified_official_metrics',racers,eligibleForCalibration:false,
  missing,
  warning:'CapturedAt is a recorder timestamp, not proof of pre-race availability; boat and entry course are distinct.'};
}
