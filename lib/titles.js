/* The hero's title lockups fly in 3D, as in the user's reference video: the whole block moves as one plane in space.
   - A ("TESLA / ROADSTER" + ghost 2028) exits over p .236 → .5 on an ease-in: it swings up-left and away
     (rotateX + rotateY + translateZ), blurring and fading over the second half of its window.
   - B ("THE ROAD / ENDS HERE") enters over p .5 → .764 on an ease-out: it starts huge and tilted at the upper left,
     close to the camera and partly off-screen, then settles flat in the corner.
   JS writes eased 0 → 1 values (--e) and opacity; CSS derives the transforms (Principle 13: JS drives custom
   properties, never layout). Blur is written only while a block is in flight, so nothing keeps a filter surface at
   rest. Everything derives from p, so scrubbing back reverses it exactly. */
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeIn = (t) => t * t * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const smooth = (a, b, t) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };

export function createTitles(root, { reduced = false } = {}) {
  const A = root.querySelector('[data-title="a"]');
  const B = root.querySelector('[data-title="b"]');
  let last = -1;

  const write = (el, e, opacity, blur) => {
    el.style.setProperty('--e', e.toFixed(4));
    el.style.opacity = opacity.toFixed(3);
    el.style.filter = blur > .05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    el.style.visibility = opacity < .002 ? 'hidden' : 'visible';
  };

  return {
    set(p) {
      const q = Math.round(p * 10000) / 10000;
      if (q === last) return;
      last = q;
      if (reduced) { write(A, 0, p < .5 ? 1 : 0, 0); write(B, 0, p < .5 ? 0 : 1, 0); return; }
      const a = clamp01((p - .236) / .264), b = clamp01((p - .5) / .264);
      write(A, easeIn(a), 1 - smooth(.5, 1, a), 21 * a * a);
      write(B, 1 - easeOut(b), smooth(0, .618, b), 21 * (1 - b) * (1 - b));
    },
  };
}
