// Research-only immutable-shape input record; never asserts pre-race authenticity.
import {validateOfficialMetrics} from './boat-score-2-official-metrics.js';
export function buildResearchFeatureSnapshot({date,venue,race,capturedAt,official,courseByBoat=[],recent50=[]}={}){
 if(!/^20\d{6}$/.test(String(date??''))||!Number.isInteger(venue)||venue<1||venue>24||
 !Number.isInteger(race)||race<1||race>12||!Number.isFinite(Date.parse(capturedAt)))
 return {status:'invalid_capture_identity',eligibleForCalibration:false};
 const checked=validateOfficialMetrics(official);
 if(!checked.verified)return {status:'unverified_official',reason:checked.reason,eligibleForCalibration:false};
 const courses=new Map(),recent=new Map();
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
 const racers=checked.racers.map(r=>{
  const course=courses.get(r.boat),history=recent.get(r.racerId);
  const verifiedCourse=course?.verified===true&&String(course.racerId)===r.racerId&&Number.isInteger(course.entryCourse)&&course.entryCourse>=1&&course.entryCourse<=6;
  const verifiedRecent=history?.verified===true&&typeof history.firstPlaceRate==='number'&&Number.isFinite(history.firstPlaceRate)&&history.firstPlaceRate>=0&&history.firstPlaceRate<=100;
  return {...r,entryCourse:verifiedCourse?course.entryCourse:null,entryCourseVerified:verifiedCourse,
   recent50FirstPlaceRate:verifiedRecent?history.firstPlaceRate:null,recent50Verified:verifiedRecent,
   startTiming:null,exhibitionTime:null,weather:null};
 });
 return {status:'captured_research_inputs',date,venue,race,capturedAt,
  source:'verified_official_metrics',racers,eligibleForCalibration:false,
  missing:['independently_verified_official_cutoff','independently_verified_official_result','pre_race_source_authentication',
   'start_timing','exhibition','weather'],
  warning:'CapturedAt is a recorder timestamp, not proof of pre-race availability; boat and entry course are distinct.'};
}
