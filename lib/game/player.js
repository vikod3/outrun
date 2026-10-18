/* The Roadster. Dino's jump (initial velocity grows with speed, release cuts the climb once past MIN_JUMP), plus a
   thrust phase: while the key is held, gravity drops to THRUST_G for up to THRUST_MAX steps — higher and longer.
   Stage 7: tap to hover (the user replaced stage 6's double-tap afterburner). Every press in the air after the jump is
   a thrust pulse (pump): it adds PUMP to the upward speed, from PUMPS per jump. Gravity acts between taps, so fast
   tapping holds the car up, slower lets it sink and stopping drops it. That is what clears the fuel truck. */
import { C } from './config.js';

export function createPlayer() {
  return {
    y: 0, vy: 0, airborne: false, thrust: 0, thrusting: false, reachedMin: false,
    wheel: 0, tilt: 0, jumped: false, landed: false, pumps: C.PUMPS, kick: 0,
  };
}

export function jump(p, speed) {
  if (p.airborne) return false;
  p.vy = C.JUMP_V0 + speed * C.JUMP_SPEED_K;
  p.airborne = true;
  p.thrust = 0;
  p.reachedMin = false;
  p.jumped = true;
  p.pumps = C.PUMPS; p.kick = 0;
  return true;
}

/* a thrust pulse: a press in the air — a fall is halved first, then PUMP is added, capped at PUMP_VMAX */
export function pump(p) {
  if (!p.airborne || p.pumps <= 0) return false;
  p.pumps--;
  p.vy = Math.min(C.PUMP_VMAX, (p.vy < 0 ? p.vy * .5 : p.vy) + C.PUMP);
  p.kick = 8;                                // frames the jets flare (render.js)
  return true;
}

export function stepPlayer(p, held, speed) {
  p.landed = false;
  p.wheel += speed / 6;                     // wheel radius 6 units
  if (!p.airborne) {
    p.thrusting = false;
    p.tilt += (0 - p.tilt) * .3;
    return;
  }
  if (p.kick > 0) p.kick--;
  let g = C.GRAVITY;
  p.thrusting = held && p.thrust < C.THRUST_MAX && p.y < C.MAX_JUMP;
  if (p.thrusting) { g *= C.THRUST_G; p.thrust++; }
  p.y += p.vy;
  p.vy -= g;
  if (p.y >= C.MIN_JUMP) p.reachedMin = true;
  if (!held && p.reachedMin) p.vy = Math.min(p.vy, C.DROP_V);
  if (p.y >= C.MAX_JUMP) p.vy = Math.min(p.vy, C.CAP_V);   // a soft ceiling: the thrusters hover, no overshoot
  if (p.y <= 0) {
    p.y = 0; p.vy = 0; p.airborne = false; p.thrust = 0; p.thrusting = false; p.landed = true; p.pumps = C.PUMPS; p.kick = 0;
  }
  const target = Math.max(-5, Math.min(5, p.vy * .55));   // degrees, nose up on the climb
  p.tilt += (target - p.tilt) * .25;
}

/* steps from take-off to landing for a full-hold jump at this speed (cached; used for the spawn gap) */
const airCache = new Map();
export function airtime(speed) {
  const key = [speed.toFixed(2), C.JUMP_V0, C.JUMP_SPEED_K, C.THRUST_MAX, C.THRUST_G, C.GRAVITY, C.MAX_JUMP, C.CAP_V].join('|');
  if (airCache.has(key)) return airCache.get(key);
  const p = createPlayer();
  jump(p, speed);
  let n = 0;
  while (p.airborne && n < 600) { stepPlayer(p, true, speed); n++; }
  airCache.set(key, n);
  return n;
}
