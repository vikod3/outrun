/* The site cursor: a 34 white circle with a difference blend (visible on the dark video and on the white tile and
   buttons alike). It follows the pointer with a light lerp (k .382 per frame) — smooth but immediate, not a trail.
   It grows ×1.618 over buttons and links, shrinks to .8 while pressed, stays hidden until the first move and while
   the pointer is outside the window. Fine pointers only: on touch the system cursor stays. The ring's liquid
   (lib/ring.js) pulls toward the same pointer, so the membrane visibly reaches for this circle. */
const K = .382;
const INTERACTIVE = 'button, a';

export function createCursor() {
  if (!matchMedia('(pointer: fine)').matches) return null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  document.documentElement.classList.add('has-cursor');

  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, seen = false;
  const place = () => { el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; };
  const tick = () => {
    x += (tx - x) * K; y += (ty - y) * K;
    if (Math.abs(tx - x) < .1 && Math.abs(ty - y) < .1) { x = tx; y = ty; }
    place();
    raf = x !== tx || y !== ty ? requestAnimationFrame(tick) : 0;
  };

  addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    tx = e.clientX; ty = e.clientY;
    if (!seen || reduced) { x = tx; y = ty; place(); }
    if (!seen) { seen = true; el.classList.add('is-on'); }
    el.classList.toggle('is-hover', !!(e.target instanceof Element && e.target.closest(INTERACTIVE)));
    if (!reduced && !raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.documentElement.addEventListener('mouseleave', () => el.classList.remove('is-on'));
  document.documentElement.addEventListener('mouseenter', () => { if (seen) el.classList.add('is-on'); });

  return {
    el,
    get pos() { return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }; },
    /* dev: settle the lerp synchronously (the preview pane can stop rAF) */
    settle() { x = tx; y = ty; place(); },
  };
}
