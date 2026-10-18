/* Hero (stage 4). Turning the pointer round the tick ring (lib/ring.js: a Ø 466 zone, every approach starts at the
   first frame) scrubs the orbit clip with inertia; the same value flies the title lockups through 3D space — TESLA /
   ROADSTER out, DEFY / GRAVITY in (lib/titles.js). START is the glass disc in the middle of the ring (click, Space or
   Enter), enabled once the clip and the fonts are ready; main.js then runs the liquid-glass wipe (lib/wipe.js) from
   the clip's current frame into the game. */
import { initHeroVideo } from './hero-video.js';
import { createRing } from './ring.js';
import { createTitles } from './titles.js';

export function createHero(root, { onStart }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const video = initHeroVideo(root.querySelector('[data-hero-video]'));
  const titles = createTitles(root, { reduced });
  const start = root.querySelector('[data-start]');
  let active = true;

  const ring = createRing(root.querySelector('[data-ring]'), {
    onChange(p) { if (active) { video.scrub(p); titles.set(p); } },   // released (the launch): the clip is left alone
  });
  titles.set(0);

  const go = () => { if (active && !start.disabled) onStart(); };
  start.addEventListener('click', go);
  addEventListener('keydown', (e) => {
    if (!active || e.repeat || (e.code !== 'Space' && e.code !== 'Enter')) return;
    if (e.target === start) return;            // the button's own click already fires
    e.preventDefault(); go();
  });

  Promise.all([video.ready, document.fonts.ready]).then(() => { start.disabled = false; });

  return {
    setActive(v) { active = v; if (v) ring.engage(); else ring.release(); },   // START: nothing stays lit or bent
    /* Menu → back to the hero: the clip at its first frame, the ring at 0 */
    rewind() {
      const v = video.video;
      if (v) { v.pause(); try { v.currentTime = .001; } catch {} }
      ring.set(0); ring.step(600); titles.set(0);
    },
    get progress() { return ring.value; },
    get target() { return ring.target; },
    get lit() { return ring.lit; },
    get k() { return ring.k; },
    get bulge() { return ring.bulge; },
    get attached() { return ring.attached; },
    get tilt() { return ring.tilt; },
    set: ring.set,                             // dev: drive the ring to p ∈ [0, 1]
    step: ring.step,                           // dev: advance the inertia synchronously
    video,
  };
}
