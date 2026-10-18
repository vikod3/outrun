/* Speed ramp, distance, phase (with steps since the last change, for the HUD's callout) and parallax offsets. Dino accelerates every step until MAX_SPEED. */
import { C } from './config.js';

export function createWorld() {
  return { speed: C.SPEED, units: 0, runSteps: 0, phase: 0, prevPhase: 0, phaseSteps: 0, fade: 1, far: 0, mid: 0, ground: 0, sky: 0 };
}

export const meters = (w) => w.units * C.DIST_COEFF;
export const mph = (w) => Math.round(w.speed * C.MPH);

export function stepWorld(w) {
  w.runSteps++;
  w.phaseSteps++;
  if (w.speed < C.MAX_SPEED) w.speed = Math.min(C.MAX_SPEED, w.speed + C.ACCEL);
  w.units += w.speed;
  w.ground += w.speed;
  w.mid += w.speed * .4;
  w.far += w.speed * .1;
  w.sky += w.speed * .02;
  const m = meters(w);
  let phase = 0;
  for (let i = 0; i < C.PHASES.length; i++) if (m >= C.PHASES[i]) phase = i;
  if (phase !== w.phase) { w.prevPhase = w.phase; w.phase = phase; w.fade = 0; w.phaseSteps = 0; }
  if (w.fade < 1) w.fade = Math.min(1, w.fade + 1 / C.PHASE_FADE);
}
