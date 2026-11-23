// Research-only bridge: prepare a snapshot from a real API response that already
// contains twelve tickets. Never synthesize picks from scores or results.
import {prepareTwelvePickCapture} from './prepare-twelve-pick-capture.mjs';
export function prepareCaptureFromApiResponse({selection,response,cutoffAt,capturedAt,scoreInputs}={}) {
 if(response?.ready!==true || response?.status==='error')
  return {status:'prediction_not_ready'};
 const pickArray = x => Array.isArray(x) ? x.map(p =>
  Array.isArray(p) ? p : typeof p==='string' && /^([1-6])-([1-6])-([1-6])$/.test(p)
    ? p.split('-').map(Number) : p) : x;
 return prepareTwelvePickCapture({
  date:selection?.date,venue:Number(selection?.venue),race:Number(selection?.race),
  main:pickArray(response.main),upset:pickArray(response.upset),
  cutoffAt,scoreInputs:scoreInputs??null
 },capturedAt);
}
