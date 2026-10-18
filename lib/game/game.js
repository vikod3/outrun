/* The game state machine: READY → RUNNING ⇄ PAUSED → CRASHED → BUSTED → RUNNING.
   Pure simulation on a fixed step; it keeps the previous positions so the renderer can interpolate.
   Like Dino, the first press starts the run with a jump, and a restart starts running straight away. */
import { C } from './config.js';
import { createRng } from './rng.js';
import { createPlayer, jump, pump, stepPlayer } from './player.js';
import { createSpawner, moveObstacle } from './obstacles.js';
import { hits } from './collide.js';
import { createWorld, stepWorld, meters, mph } from './world.js';

export const READY = 'ready', RUNNING = 'running', PAUSED = 'paused', CRASHED = 'crashed', BUSTED = 'busted';
export const NOZZLES = [6.3, 14, 106.1, 113.8];   // nozzle x in car units: two at each end (lib/game/sprites.js GEO)
const MAX_PARTICLES = 34;

export function createGame({ input, onStatus = () => {}, seed } = {}) {
  const rng = createRng(seed ?? (Date.now() & 0x7fffffff));
  const spawner = createSpawner(rng);
  const g = {
    status: READY, frame: 0, statusSteps: 0, viewW: C.FIELD_W, playerX: C.PLAYER_X * C.FIELD_W,
    world: createWorld(), player: createPlayer(), obstacles: [], particles: [], chaser: 0,
    stats: { topMph: 0, maxY: 0 },   // the run's peaks for the Busted summary, kept per step so step(n) never misses one
    boss: { steps: -1, count: 0 },   // steps since the last fuel truck spawned (−1: none yet) and how many, for the HUD callout
    prev: { y: 0, ground: 0, mid: 0, far: 0, sky: 0 },
  };

  const setStatus = (st) => { if (g.status === st) return; g.status = st; g.statusSteps = 0; onStatus(st); };

  const puff = (kind) => {
    for (const nx of NOZZLES) {
      for (let i = 0; i < (kind === 'land' ? 1 : 2); i++) {        // four nozzles: fewer puffs each
        g.particles.push({
          x: g.playerX + nx + (rng() - .5) * 13, px: 0, y: rng() * 5, r: 5 + rng() * 5,
          grow: .55 + rng() * .5, life: 0, max: 34 + Math.floor(rng() * 21), a: kind === 'land' ? .236 : .382,
        });
      }
    }
    while (g.particles.length > MAX_PARTICLES) g.particles.shift();
    for (const p of g.particles) if (!p.px) p.px = p.x;
  };

  const savePrev = () => {
    const w = g.world;
    Object.assign(g.prev, { y: g.player.y, ground: w.ground, mid: w.mid, far: w.far, sky: w.sky });
    for (const o of g.obstacles) o.px = o.x;
    for (const p of g.particles) p.px = p.x;
  };

  const stepParticles = (speed) => {
    for (const p of g.particles) { p.x -= speed; p.r += p.grow; p.life++; }
    g.particles = g.particles.filter((p) => p.life < p.max);
  };

  const crash = () => {
    setStatus(CRASHED);
  };

  function reset() {
    g.world = createWorld();
    g.player = createPlayer();
    g.obstacles = [];
    g.particles = [];
    g.chaser = 0;
    g.stats = { topMph: 0, maxY: 0 };
    g.boss = { steps: -1, count: 0 };
    spawner.reset();
    savePrev();
  }

  function step() {
    g.frame++;
    g.statusSteps++;
    const events = input ? input.drain() : [];
    const held = input ? input.held : false;
    savePrev();
    const w = g.world, p = g.player;

    switch (g.status) {
      case READY:
        if (events.includes('press')) { setStatus(RUNNING); jump(p, w.speed); puff('jump'); }
        stepPlayer(p, held, 0);
        break;

      case RUNNING: {
        if (events.includes('pause')) { setStatus(PAUSED); break; }
        if (events.includes('press')) { if (jump(p, w.speed)) puff('jump'); else pump(p); }   // in the air: a thrust pulse
        stepWorld(w);
        stepPlayer(p, held, w.speed);
        if (p.landed) puff('land');
        g.stats.maxY = Math.max(g.stats.maxY, p.y);
        g.stats.topMph = Math.max(g.stats.topMph, mph(w));
        for (const o of g.obstacles) moveObstacle(o, w.speed);
        g.obstacles = g.obstacles.filter((o) => o.x + o.w > -C.POLICE.w);
        if (w.runSteps > C.CLEAR_TIME) {
          const o = spawner.maybeSpawn(g.obstacles, w.speed, g.viewW);
          if (o) { o.px = o.x; g.obstacles.push(o); if (o.kind === 'tanker') { g.boss.steps = 0; g.boss.count++; } }
        }
        if (g.boss.steps >= 0) g.boss.steps++;
        stepParticles(w.speed);
        if (!C.GOD && g.obstacles.some((o) => hits(p, g.playerX, o))) crash();
        break;
      }

      case PAUSED:
        if (events.some((e) => e === 'pause' || e === 'press' || e === 'confirm')) setStatus(RUNNING);
        break;

      case CRASHED:
      case BUSTED:
        g.chaser = Math.min(1, g.statusSteps / C.CHASER_IN);
        stepParticles(0);
        if (g.status === CRASHED && g.statusSteps >= C.BUSTED_DELAY) {
          const s = g.statusSteps; setStatus(BUSTED); g.statusSteps = s;
        }
        if (g.statusSteps >= C.RESTART_LOCK && events.some((e) => e === 'press' || e === 'confirm')) restart();
        break;
    }
  }

  function restart(force = false) {
    if (!force && g.statusSteps < C.RESTART_LOCK) return false;
    if (g.status !== CRASHED && g.status !== BUSTED) return false;
    reset();
    setStatus(RUNNING);
    return true;
  }

  function snapshot() {
    const r = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
    const p = g.player, w = g.world;
    return {
      status: g.status, frame: g.frame, statusSteps: g.statusSteps,
      speed: r(w.speed, 3), distance: r(meters(w), 1), mph: mph(w), phase: w.phase, phaseSteps: w.phaseSteps, fade: r(w.fade),
      player: { y: r(p.y), vy: r(p.vy), airborne: p.airborne, thrust: p.thrust, thrusting: p.thrusting, pumps: p.pumps },
      obstacles: g.obstacles.map((o) => ({ type: o.key, x: r(o.x, 1), y0: o.y0, w: o.w, h: o.h })),
      particles: g.particles.length, chaser: r(g.chaser), viewW: r(g.viewW, 1), playerX: r(g.playerX, 1),
      stats: { topMph: g.stats.topMph, maxY: r(g.stats.maxY), runSteps: w.runSteps },
      boss: { ...g.boss },
    };
  }

  return {
    g, step, snapshot, reset,
    restart: () => restart(false),
    pause() { if (g.status === RUNNING) setStatus(PAUSED); },
    toReady() { reset(); setStatus(READY); },
    reseed(n) { rng.seed(n); },
    setView(viewW) { g.viewW = viewW; g.playerX = C.PLAYER_X * viewW; },
  };
}
