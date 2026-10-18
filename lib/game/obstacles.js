/* Oncoming police (rows of 1–3), drones (low: jump it; high: drive under it), the delivery courier (stage 7b: rides
   our way slower, we overtake and jump him) and, from stage 6, the fuel truck
   mini-boss (1 truck, or 2 from TANKER.two: only tapping to hover outlasts it). Movement and the spawn rule
   follow Dino: a new obstacle appears once the last one plus its gap has cleared the right edge, types are rolled
   among those unlocked at the current speed, and at most MAX_DUP identical ones come in a row. The gap is measured in
   time, not width × speed: a full jump plus REACT steps, at the fastest relative speed — after a truck, plus a flight
   tapped out on the whole pulse budget. The second obstacle of every run is a truck (later ones roll TANKER.share,
   TANKER.apart apart) and the third the courier (later a regular type); the first is always one police car. */
import { C } from './config.js';
import { airtime } from './player.js';

export const rowWidth = (n) => n * C.POLICE.w + (n - 1) * C.POLICE.gap;
export const truckRow = (n) => n * C.TANKER.w + (n - 1) * C.TANKER.gap;
export const trucksAt = (speed) => (speed >= C.TANKER.two ? 2 : 1);

export function makeObstacle(spec, x, rng = Math.random) {
  if (spec.kind === 'police') {
    return { kind: 'police', n: spec.n, x, y0: 0, w: rowWidth(spec.n), h: C.POLICE.h, offset: 0, gap: 0, key: 'police' + spec.n, seed: rng() };
  }
  if (spec.kind === 'courier') {
    return { kind: 'courier', x, y0: 0, w: C.COURIER.w, h: C.COURIER.h, offset: 0, gap: 0, key: 'courier', seed: rng() };
  }
  if (spec.kind === 'tanker') {
    return { kind: 'tanker', n: spec.n, x, y0: 0, w: truckRow(spec.n), h: C.TANKER.h, offset: 0, gap: 0, key: 'tanker' + spec.n, seed: rng() };
  }
  return {
    kind: 'drone', high: !!spec.high, x, y0: spec.high ? C.DRONE.high : C.DRONE.low, w: C.DRONE.w, h: C.DRONE.h,
    offset: rng() > .5 ? C.DRONE.offset : -C.DRONE.offset, gap: 0, key: spec.high ? 'droneH' : 'droneL', seed: rng(),
  };
}

/* units per step this obstacle closes on the car */
export const closing = (o, speed) => (o.kind === 'police' ? speed * (1 + C.POLICE.offset)
  : o.kind === 'tanker' ? speed * (1 + C.TANKER.offset)
  : o.kind === 'courier' ? speed * (1 - C.COURIER.own) : speed + o.offset);
export const moveObstacle = (o, speed) => { o.x -= closing(o, speed); };

const fastest = (speed) => Math.max(speed * (1 + C.POLICE.offset), speed * (1 + C.TANKER.offset), speed + C.DRONE.offset);
export function minGap(speed) {
  return (airtime(speed) + C.REACT) * fastest(speed);
}
/* the gap behind an obstacle: over a truck the jump is stretched by tapping, which a player stops once the truck is
   behind (sim.js models exactly that) — 13 × 5 extra steps (stage 8; was the whole budget at one tap every 8) */
export function gapAfter(o, speed) {
  return o.kind === 'tanker' ? (airtime(speed) + C.PUMPS * 5 + C.REACT) * fastest(speed) : minGap(speed);
}

export function rollSpec(rng, speed) {
  if (speed >= C.DRONE.minSpeed && rng() < C.DRONE_SHARE) return { kind: 'drone', high: rng() < .5 };
  if (rng() < C.COURIER.share) return { kind: 'courier' };
  const maxN = speed >= C.ROW3_SPEED ? 3 : speed >= C.ROW2_SPEED ? 2 : 1;
  return { kind: 'police', n: 1 + Math.floor(rng() * maxN) };
}

const keyOf = (s) => (s.kind === 'police' ? 'police' + s.n : s.kind === 'tanker' ? 'tanker' + s.n : s.kind === 'courier' ? 'courier'
  : s.high ? 'droneH' : 'droneL');

export function createSpawner(rng) {
  const history = [];
  let count = 0, since = 0;                  // spawns this run; spawns since the last truck
  return {
    history,
    reset() { history.length = 0; count = 0; since = 0; },
    /* call every step while running; returns a new obstacle or null */
    maybeSpawn(list, speed, viewW) {
      const last = list[list.length - 1];
      if (last && last.x + last.w + last.gap > viewW) return null;
      let spec;
      count++;
      if (count === 1) {
        spec = { kind: 'police', n: 1 };       // every run opens police → truck → courier
      } else if (count === C.TANKER.at || (count > C.TANKER.at && since >= C.TANKER.apart && rng() < C.TANKER.share)) {
        spec = { kind: 'tanker', n: trucksAt(speed) };
      } else if (count === C.COURIER.at) {
        spec = { kind: 'courier' };
      } else {
        spec = rollSpec(rng, speed);
        for (let i = 0; i < 10; i++) {
          const recent = history.slice(-C.MAX_DUP);
          if (recent.length < C.MAX_DUP || recent.some((k) => k !== keyOf(spec))) break;
          spec = rollSpec(rng, speed);
        }
      }
      since = spec.kind === 'tanker' ? 0 : since + 1;
      history.push(keyOf(spec));
      if (history.length > 8) history.shift();
      const o = makeObstacle(spec, viewW + 8, rng);
      const g = gapAfter(o, speed);
      o.gap = g + rng() * (C.GAP_MAX - 1) * g;
      return o;
    },
  };
}
