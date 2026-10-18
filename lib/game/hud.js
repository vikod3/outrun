/* DOM HUD v5 ("SpaceX telemetry", the user's pick after "the game UI doesn't match the hero, it's boring"):
   - the cluster (telemetry.js draws the ticks): SPEED and ALTITUDE gauges with their numbers, the thrust budget, and
     the mission timeline blue hour → night → chase → best, with the distance riding the head and the T+ clock;
   - the callout: a lockup that flies in 3D like the hero's, on each phase (world.phaseSteps) and on each fuel truck
     (g.boss.steps: "Fuel truck / Tap fast", stage 7) — the newer one wins; driven by steps, not timers, so pausing
     freezes it and __game.step() can test it;
   - Busted v2: the phase you were caught in over BUSTED, the ring filled to distance / best around the Restart disc,
     the run's summary. Its entrance runs off the game's statusSteps too; Restart enables at RESTART_LOCK and never
     waits for it.
   Text is written only when it changes; the canvases redraw only when what they show changes. */
import { C } from './config.js';
import { meters, mph } from './world.js';
import { READY, RUNNING, PAUSED, BUSTED } from './game.js';
import { createTelemetry, createBustRing, GEO } from './telemetry.js';

const PHASES = ['Blue hour', 'Night', 'Chase'];
const BEST_KEY = 'outrun:best';
const IN = 37;                                   // steps of an entrance (≈ 610 ms), the callout's exit too
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const expoOut = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const smooth = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const pad = (n, len) => String(n).padStart(len, '0');
const group = (m) => String(Math.floor(m)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
/* mm:ss with the colon in Oxanium — Doto's own colon reads as a dagger */
const clock = (steps) => { const s = Math.floor(steps / C.FPS); return `${pad(Math.floor(s / 60), 2)}<i class="colon">:</i>${pad(s % 60, 2)}`; };
const loadBest = () => { try { return Math.floor(Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; } };
const saveBest = (m) => { try { localStorage.setItem(BEST_KEY, String(m)); } catch { /* private mode: this session only */ } };

export function createHud(root, { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  const $ = (s) => root.querySelector(s);
  const el = {
    speed: $('[data-speed]'), alt: $('[data-alt]'), dist: $('[data-dist]'), distAt: $('[data-dist-at]'),
    clockT: $('[data-clock-t]'), clock: $('[data-clock]'), best: $('[data-best]'),
    nodes: [...root.querySelectorAll('[data-node]')],
    callout: $('[data-callout]'), calloutSm: $('[data-callout-sm]'), calloutLg: $('[data-callout-lg]'),
    pause: $('[data-pause]'), restart: $('[data-restart]'),
    bustTitle: $('[data-bust-title]'), bustPhase: $('[data-bust-phase]'), bustBest: $('[data-bust-best]'),
    bustIn: [...root.querySelectorAll('[data-bust-in]')],
    stat: Object.fromEntries([...root.querySelectorAll('[data-stat]')].map((n) => [n.dataset.stat, n])),
  };
  const tele = createTelemetry($('[data-telemetry]'));
  const ring = createBustRing($('[data-bust-ring]'));

  const last = new Map();
  const put = (node, v) => { if (last.get(node) !== v) { node.textContent = v; last.set(node, v); } };
  const html = (node, v) => { if (last.get(node) !== v) { node.innerHTML = v; last.set(node, v); } };
  const states = new Map();
  const state = (node, v) => { if (states.get(node) !== v) { node.dataset.state = v; states.set(node, v); } };
  const fly = (node, vars, opacity, blur) => {   // the titles.js write: custom props, opacity, blur only in flight
    for (const [k, v] of Object.entries(vars)) node.style.setProperty(k, (reduced ? 0 : v).toFixed(4));
    node.style.opacity = opacity.toFixed(3);
    node.style.filter = !reduced && blur > .05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    node.style.visibility = opacity < .002 ? 'hidden' : 'visible';
  };

  let best = loadBest(), runBest = best;         // runBest: the best as this run began — the timeline's end
  let shownMph = 0, calloutPhase = -1, calloutOn = false;
  let bust = { target: 0, done: true };

  /* the timeline in equal thirds: blue hour and night fill over their 500 m, the chase fills toward the best run */
  const lineAt = (d) => {
    const [, p1, p2] = C.PHASES, end = Math.max(runBest, p2 * 1.5);
    if (d < p1) return d / p1 / 3;
    if (d < p2) return (1 + (d - p1) / (p2 - p1)) / 3;
    return (2 + clamp01((d - p2) / (end - p2))) / 3;
  };
  const writeBest = () => put(el.best, best > 0 ? `Best ${group(best)} m` : 'Best —');
  writeBest();

  function telemetry(g, a) {
    const w = g.world, p = g.player, st = g.status, run = st !== READY;
    const d = meters(w);
    const target = st === RUNNING || st === PAUSED ? mph(w) : 0;      // READY and the crash: the needle falls to 0
    shownMph += (target - shownMph) * .12;
    if (Math.abs(target - shownMph) < .5) shownMph = target;
    const y = g.prev.y + (p.y - g.prev.y) * (st === RUNNING || st === READY ? a : 1);
    const ft = Math.max(0, y) * C.ALT_FT;
    const line = run ? lineAt(d) : -1;
    const flashing = run && w.phase > 0 && w.fade < 1;
    tele.draw({
      speed: shownMph / C.GAUGE_MPH,
      alt: ft / (C.MAX_JUMP * C.ALT_FT),
      thrust: p.pumps / C.PUMPS,                                   // the 13 ticks are the thrust pulses left this jump
      firing: p.thrusting || p.kick > 0,
      line,
      flashNode: flashing ? w.phase : -1,
      flash: flashing ? (1 - w.fade) ** 2 : 0,
    });
    put(el.speed, pad(Math.round(shownMph), 3));
    put(el.alt, pad(Math.round(ft), 3));
    put(el.dist, String(Math.floor(d)));                             // Doto: no digit grouping (its space is a full cell)
    const x = tele.headX(line);                                     // clamped per layout (telemetry.js)
    if (last.get(el.distAt) !== x) { el.distAt.style.setProperty('--x', x.toFixed(1)); last.set(el.distAt, x); }
    put(el.clockT, run ? 'T+' : 'T−');
    html(el.clock, clock(run ? w.runSteps : 0));
    el.nodes.forEach((n, i) => {
      if (i === 3) { state(n, run && runBest > 0 && d > runBest ? 'beat' : 'next'); return; }
      state(n, i < w.phase ? 'past' : i === w.phase ? 'now' : 'next');
    });
  }

  /* in over IN steps (from huge and near, mirrored hero B), hold, away over the last IN (mirrored hero A). Two sources:
     a new phase and a fuel truck entering; the newer one wins. */
  function callout(g, a) {
    const w = g.world, live = g.status === RUNNING || g.status === PAUSED;   // a crash clears the sky for Busted
    const da = g.status === RUNNING ? a : 0;
    const phase = w.phase > 0 && w.phaseSteps < C.CALLOUT ? w.phaseSteps : Infinity;
    const boss = g.boss.steps >= 0 && g.boss.steps < C.CALLOUT ? g.boss.steps : Infinity;
    const t = Math.min(phase, boss) + da;
    const on = live && t < C.CALLOUT;
    const key = boss <= phase ? `b${g.boss.count}` : `p${w.phase}`;
    if (on && calloutPhase !== key) {
      calloutPhase = key;
      put(el.calloutSm, boss <= phase ? 'Fuel truck' : `Phase ${pad(w.phase + 1, 2)}`);
      put(el.calloutLg, boss <= phase ? 'Tap fast' : PHASES[w.phase]);
    }
    if (!on) { if (calloutOn) { fly(el.callout, { '--e': 0, '--o': 1 }, 0, 0); calloutOn = false; } return; }
    calloutOn = true;
    const i = clamp01(t / IN), o = clamp01((t - (C.CALLOUT - IN)) / IN);
    fly(el.callout, { '--e': 1 - easeOut(i), '--o': easeIn(o) },
      smooth(0, .618, i) * (1 - smooth(.5, 1, o)), 21 * (1 - i) ** 2 + 21 * o * o);
  }

  /* Busted's entrance, from the steps since BUSTED appeared */
  function busted(g, a) {
    el.restart.disabled = g.statusSteps < C.RESTART_LOCK;
    if (bust.done) return;
    const k = g.statusSteps - C.BUSTED_DELAY + a;
    const t = clamp01(k / IN);
    fly(el.bustTitle, { '--e': 1 - easeOut(t) }, smooth(0, .618, t), 21 * (1 - t) ** 2);
    ring.set(bust.target * expoOut(clamp01(k / 59)));
    el.bustIn.forEach((n, i) => {
      const e = expoOut(clamp01((k - 8 - i * 5.34) / IN));   // 89 ms stagger
      n.style.opacity = e.toFixed(3);
      n.style.transform = e < 1 ? `translateY(${(21 * (1 - e)).toFixed(2)}px)` : 'none';
      n.style.filter = !reduced && e < .99 ? `blur(${(8 * (1 - e)).toFixed(2)}px)` : 'none';
    });
    if (k > 8 + el.bustIn.length * 5.34 + IN + 2 && k > 59) bust.done = true;
  }

  return {
    update(game, a = 1) {
      const g = game.g;
      telemetry(g, a);
      callout(g, a);
      if (g.status === BUSTED) busted(g, a);
    },
    status(st, game) {
      const g = game.g, w = g.world;
      root.dataset.status = st;
      el.pause.disabled = !(st === RUNNING || st === PAUSED);
      put(el.pause, st === PAUSED ? 'Resume' : 'Pause');
      if (st === READY) { shownMph = 0; runBest = best; }
      if (st === RUNNING && w.runSteps === 0) {   // a new run (launch or restart), not a resume
        runBest = best; calloutPhase = -1;
        fly(el.callout, { '--e': 1, '--o': 0 }, 0, 0); calloutOn = false;
      }
      if (st === BUSTED) {
        const d = Math.floor(meters(w)), isNew = d > best;
        if (isNew) { best = d; saveBest(best); writeBest(); }
        put(el.bustPhase, `Phase ${pad(w.phase + 1, 2)} · ${PHASES[w.phase]}`);
        put(el.stat.dist, String(d));
        put(el.stat.mph, String(g.stats.topMph));
        put(el.stat.alt, String(Math.round(g.stats.maxY * C.ALT_FT)));
        html(el.stat.time, clock(w.runSteps));
        put(el.bustBest, isNew ? 'New best' : `Best ${group(best)} m`);
        el.bustBest.classList.toggle('is-new', isNew);
        bust = { target: best > 0 ? Math.min(1, d / best) : 1, done: false };
        ring.set(0, `${group(d)} m`);
        el.restart.disabled = true;
        busted(g, 0);
      }
    },
    /* dev: what the instruments show */
    debug: () => ({
      mph: Math.round(shownMph), best, runBest, callout: calloutOn ? Number(el.callout.style.opacity) : 0,
      redraws: tele.redraws, ringLit: ring.lit, ringRedraws: ring.redraws, restartDisabled: el.restart.disabled,
    }),
    get geo() { return GEO; },
  };
}
