/* The fairness harness — the acceptance gate for the tuning table. Pure state, no rendering, runs in the browser
   (__game.sim()) and in Node. For each obstacle configuration at its unlock speed and at MAX_SPEED it brute-forces
   the press step × hold length and counts the reaction window: the steps at which a press clears the obstacle.
   Pass:
   1. window ≥ MIN_WINDOW for every jumpable configuration;
   2. a tap clears one police car at the start speed;
   3. three police cars at their unlock speed need the hold (a tap is not reliable: window < MIN_WINDOW; hold ≥);
   4. the high drone is passed by not jumping, and some jump under it crashes;
   5. two obstacles at the minimum gap are both clearable (window ≥ MIN_WINDOW for the second; behind a truck the gap
      includes a flight tapped out on the whole pulse budget);
   6. one fuel truck (below TANKER.two) and two (from it) are never cleared by a single jump, tap or hold;
   7. tapping clears them: window ≥ MIN_WINDOW for a tap every 6, 8 and 10 steps (10–6 a second);
   8. the courier (overtaken, Dino's cactus) is cleared by a plain tap: window ≥ MIN_WINDOW at the start and top speed.
   A press is { at, hold, taps? }: `taps` = { every } — after the jump, a tap (held TAP steps) every `every` steps, each
   a thrust pulse, until every truck is behind the car (as a player stops), the budget runs out or the car lands. */
import { C } from './config.js';
import { createPlayer, jump, pump, stepPlayer, airtime } from './player.js';
import { makeObstacle, moveObstacle, minGap, gapAfter } from './obstacles.js';
import { hits } from './collide.js';

export const MIN_WINDOW = 6;   // steps = 100 ms
const PX = C.PLAYER_X * C.FIELD_W;
const AHEAD = 420;             // the first obstacle starts this far ahead of the car's nose
const HOLD = 1e9;              // held until landing
const worst = () => .99;       // rng for makeObstacle: drones get +offset (closing faster) = the hard case

const CONFIGS = {
  police1: { spec: { kind: 'police', n: 1 }, unlock: () => C.SPEED },
  police2: { spec: { kind: 'police', n: 2 }, unlock: () => C.ROW2_SPEED },
  police3: { spec: { kind: 'police', n: 3 }, unlock: () => C.ROW3_SPEED },
  droneL: { spec: { kind: 'drone', high: false }, unlock: () => C.DRONE.minSpeed },
  droneH: { spec: { kind: 'drone', high: true }, unlock: () => C.DRONE.minSpeed },
  courier: { spec: { kind: 'courier' }, unlock: () => C.SPEED },
  tanker1: { spec: { kind: 'tanker', n: 1 }, unlock: () => C.SPEED, until: () => C.TANKER.two },
  tanker2: { spec: { kind: 'tanker', n: 2 }, unlock: () => C.TANKER.two },
};
const isTruck = (name) => name.startsWith('tanker');
const live = (name, speed) => CONFIGS[name].unlock() <= speed && (!CONFIGS[name].until || speed < CONFIGS[name].until());
const RATES = [6, 8, 10];   // steps between taps
/* the press shapes tried for an obstacle: a tap, a hold, and for a truck tapping at three rates */
const shapes = (name) => [{ hold: C.TAP }, { hold: HOLD }, ...(isTruck(name) ? RATES.map((every) => ({ hold: C.TAP, taps: { every } })) : [])];

/* one scenario: obstacles placed one after another with `gap` between them; presses = [{ at, hold }] */
export function run(specs, speed, presses, gap = 0) {
  const p = createPlayer();
  const obs = [];
  let x = PX + C.CAR.w + AHEAD;
  for (const s of specs) { const o = makeObstacle(s, x, worst); obs.push(o); x += o.w + gap; }
  for (let f = 0; f < 1500; f++) {
    let tapHeld = false;
    for (const pr of presses) {
      if (pr.at === f) jump(p, speed);
      if (pr.taps && f > pr.at && p.airborne && obs.some((o) => o.kind === 'tanker' && o.x + o.w > PX - 4)) {
        const k = (f - pr.at) % pr.taps.every;
        if (k === 0) pump(p);
        if (k < C.TAP && p.pumps > 0) tapHeld = true;   // the finger is down for TAP steps each tap
      }
    }
    const held = tapHeld || presses.some((pr) => f >= pr.at && f < pr.at + pr.hold);
    stepPlayer(p, held, speed);
    for (const o of obs) moveObstacle(o, speed);
    for (let i = 0; i < obs.length; i++) if (hits(p, PX, obs[i])) return { ok: false, at: f, obstacle: i };
    if (obs[obs.length - 1].x + obs[obs.length - 1].w < PX - 4 && !p.airborne) return { ok: true };
  }
  return { ok: true };
}

/* the steps at which a press of this shape clears the obstacle */
function window1(spec, speed, shape) {
  let ok = 0, first = -1, last = -1;
  for (let at = 0; at < 200; at++) {
    if (run([spec], speed, [{ ...shape, at }]).ok) { ok++; if (first < 0) first = at; last = at; }
  }
  return { ok, first, last, mid: first < 0 ? -1 : Math.round((first + last) / 2) };
}

function bestPress(name, speed) {
  if (name === 'droneH') return null;
  let best = null;
  for (const shape of shapes(name)) {
    const w = window1(CONFIGS[name].spec, speed, shape);
    if (!best || w.ok > best.ok) best = { ok: w.ok, press: { ...shape, at: w.mid } };
  }
  return best.press;
}

/* window for the second obstacle B after clearing A with A's best press, at the minimum gap behind A */
function pairWindow(a, b, speed) {
  const g = gapAfter(makeObstacle(CONFIGS[a].spec, 0, worst), speed);
  const specs = [CONFIGS[a].spec, CONFIGS[b].spec];
  const pa = bestPress(a, speed);
  const pre = pa ? [pa] : [];
  if (b === 'droneH') return run(specs, speed, pre, g).ok ? Infinity : 0;
  let best = 0;
  const from = pa ? pa.at + 1 : 0;
  for (const shape of shapes(b)) {
    let ok = 0;
    for (let at = from; at < from + 400; at++) if (run(specs, speed, [...pre, { ...shape, at }], g).ok) ok++;
    best = Math.max(best, ok);
  }
  return best;
}

function apex(speed, hold) {
  const p = createPlayer(); jump(p, speed);
  let top = 0, n = 0;
  while (p.airborne && n < 600) { stepPlayer(p, n < hold, speed); top = Math.max(top, p.y); n++; }
  return { apex: Math.round(top), air: n };
}

export function runSim() {
  const rows = [];
  const speedsOf = (name) => [...new Set([CONFIGS[name].unlock(), CONFIGS[name].until ? CONFIGS[name].until() - .01 : C.MAX_SPEED])];
  for (const name of Object.keys(CONFIGS)) {
    for (const speed of speedsOf(name)) {
      if (name === 'droneH') {
        const pass = run([CONFIGS[name].spec], speed, []).ok;
        let crashes = 0;
        for (let at = 0; at < 200; at++) if (!run([CONFIGS[name].spec], speed, [{ at, hold: HOLD }]).ok) crashes++;
        rows.push({ name, speed, tap: '—', hold: '—', noJump: pass ? 'clear' : 'CRASH', jumpCrashes: crashes });
        continue;
      }
      const tap = window1(CONFIGS[name].spec, speed, { hold: C.TAP }).ok;
      const hold = window1(CONFIGS[name].spec, speed, { hold: HOLD }).ok;
      const row = { name, speed, tap, hold };
      if (isTruck(name)) for (const every of RATES) row['tap' + every] = window1(CONFIGS[name].spec, speed, { hold: C.TAP, taps: { every } }).ok;
      rows.push(row);
    }
  }

  const pairs = [];
  const names = Object.keys(CONFIGS);
  for (const speed of [C.SPEED, C.ROW2_SPEED, C.ROW3_SPEED, C.DRONE.minSpeed, C.MAX_SPEED]) {
    const on = names.filter((n) => live(n, speed));
    for (const a of on) for (const b of on) {
      if (isTruck(a) && isTruck(b)) continue;                 // trucks come TANKER.apart spawns apart
      pairs.push({ a, b, speed, window: pairWindow(a, b, speed) });
    }
  }

  const row = (n, s) => rows.find((r) => r.name === n && r.speed === s);
  const jumpable = rows.filter((r) => r.name !== 'droneH');
  const trucks = rows.filter((r) => isTruck(r.name));
  const best = (r) => Math.max(r.tap, r.hold, ...RATES.map((e) => r['tap' + e] ?? 0));
  const checks = {
    '1 every jumpable window ≥ 6': jumpable.every((r) => best(r) >= MIN_WINDOW),
    '2 tap clears one car at start speed': row('police1', C.SPEED).tap >= MIN_WINDOW,
    '3 three cars need the hold': row('police3', C.ROW3_SPEED).tap < MIN_WINDOW && row('police3', C.ROW3_SPEED).hold >= MIN_WINDOW,
    '4 high drone: pass under, jump crashes': rows.filter((r) => r.name === 'droneH').every((r) => r.noJump === 'clear' && r.jumpCrashes > 0),
    '5 pairs at min gap ≥ 6': pairs.every((p) => p.window >= MIN_WINDOW),
    '6 a single jump never clears a truck': trucks.every((r) => r.tap === 0 && r.hold === 0),
    '7 tapping clears it (every 6 / 8 / 10)': trucks.every((r) => RATES.every((e) => r['tap' + e] >= MIN_WINDOW)),
    '8 a tap clears the courier': rows.filter((r) => r.name === 'courier').every((r) => r.tap >= MIN_WINDOW),
  };
  const arcs = {
    tapAt6: apex(C.SPEED, C.TAP), holdAt6: apex(C.SPEED, HOLD),
    tapAt13: apex(C.MAX_SPEED, C.TAP), holdAt13: apex(C.MAX_SPEED, HOLD),
    minGapAt6: Math.round(minGap(C.SPEED)), minGapAt13: Math.round(minGap(C.MAX_SPEED)), airtimeAt13: airtime(C.MAX_SPEED),
  };
  const worstPairs = [...pairs].sort((x, y) => x.window - y.window).slice(0, 5);
  return { pass: Object.values(checks).every(Boolean), checks, rows, worstPairs, arcs };
}
