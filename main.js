/* Boot: the hero (stage 2) and the game (stage 1). Start hands over with a blur transition; Busted → Menu runs it back.
   Dev: ?game (open straight on the game), ?debug (hit boxes), ?tune (sliders), ?seed=N, ?god, and window.__game
   (state / step / press / release / seed / set / sim / show / hero) — step() is synchronous because the preview
   pane throttles rAF. */
import { C } from './lib/game/config.js';
import { createInput } from './lib/game/input.js';
import { createGame } from './lib/game/game.js';
import { createRenderer } from './lib/game/render.js';
import { createHud } from './lib/game/hud.js';
import { createLoop } from './lib/game/loop.js';
import { createHero } from './lib/hero.js';
import { createCursor } from './lib/cursor.js';
import { ready as spritesReady } from './lib/game/sprites.js';
import { createWipe } from './lib/wipe.js';

const params = new URLSearchParams(location.search);
const cursor = createCursor();   // the site cursor: a 34 white circle, hero and game alike
if (params.has('god')) C.GOD = true;
const body = document.body;
const root = document.querySelector('[data-game]');
const canvas = root.querySelector('[data-game-canvas]');

const input = createInput(canvas);
const hud = createHud(root);
const game = createGame({
  input,
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
  onStatus: (st) => hud.status(st, game),
});
const renderer = createRenderer(canvas, game, { debug: params.has('debug') });
const draw = (a) => { renderer.render(a); hud.update(game, a); };
const loop = createLoop({ step: game.step, render: draw });
spritesReady.then(() => draw(1));   // the canvas may be paused (ready screen): show the images as soon as they decode

/* screens: one data-screen on <body>; .is-anim only while the blur transition runs */
const DUR = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 890;
let screen = body.dataset.screen, timer = 0;
function show(next) {
  if (screen === next) return;
  screen = next;
  clearTimeout(timer);
  body.classList.add('is-anim');
  body.dataset.screen = next;
  timer = setTimeout(() => {
    body.classList.remove('is-anim');
    if (next === 'game') { input.drain(); loop.start(); }   // presses made during the transition are dropped
  }, DUR + 55);
}

/* START: the dive (lib/wipe.js) pulls the clip's current frame toward the Roadster and opens the game's first frame
   from it while the hero UI flies past the camera; then the screens cut and the HUD arrives in steps. Without WebGL2 or with reduced motion: the crossfade. */
const wipe = createWipe(document.querySelector('[data-wipe]'));
const hero = createHero(document.querySelector('[data-hero]'), {
  onStart() {
    hero.setActive(false); game.toReady(); draw(1);
    body.classList.add('is-launch');
    let liquid = null;
    if (wipe && DUR) { try { liquid = wipe.run({ from: hero.video.video, to: canvas, center: renderer.carPoint(), fade: document.querySelector('[data-hero-fade]') }); } catch { liquid = null; } }
    if (!liquid) { show('game'); return; }
    liquid.then(() => {
      clearTimeout(timer);
      screen = 'game';
      body.classList.add('is-cut'); body.dataset.screen = 'game';
      body.classList.remove('is-launch');
      setTimeout(() => body.classList.remove('is-cut'), 55);
      input.drain(); loop.start();
    });
  },
});

document.addEventListener('visibilitychange', () => { if (document.hidden && C.AUTOPAUSE) game.pause(); });
/* the header and the Restart disc; each button lets go of focus after a click, so Space goes back to the jump */
const button = (sel, fn) => root.querySelector(sel).addEventListener('click', (e) => { e.currentTarget.blur(); fn(); });
button('[data-pause]', () => input.inject('pause'));
button('[data-restart]', () => game.restart());
button('[data-menu]', () => {
  loop.stop(); game.toReady(); draw(1);
  hero.rewind(); body.classList.remove('is-launch'); hero.setActive(true); show('hero');
});
if (params.has('tune')) import('./lib/game/tune.js').then((m) => m.mountTune(game));
if (params.has('game')) { hero.setActive(false); draw(1); show('game'); }

window.__game = {
  state: () => ({ ...game.snapshot(), screen, hero: Math.round(hero.progress * 1000) / 1000 }),
  step(n = 1) { for (let i = 0; i < n; i++) game.step(); draw(1); return game.snapshot(); },
  press() { input.inject('press'); },
  release() { input.inject('release'); },
  seed(n) { game.reseed(n); },
  set(key, value) { C[key] = value; return C[key]; },
  sim: () => import('./lib/game/sim.js').then((m) => m.runSim()),
  stop: () => loop.stop(),
  start: () => loop.start(),
  show,
  hero,
  cursor,
  grade: renderer.grade,                 // dev: the film grade's values (render.js); __game.regrade() after editing vig
  regrade: () => { renderer.regrade(); draw(1); },
  wipe,                                  // dev: wipe.frame(p, t) draws one frame of the launch after a run()
  carPoint: () => renderer.carPoint(),   // dev: the dive's landing point
  warp(m) { game.g.world.units = m / C.DIST_COEFF; },   // dev: jump the run to m metres (phase callouts, the chase)
  hud: () => hud.debug(),                // dev: what the telemetry and Busted show (mph, callout, ring, redraws)
};
