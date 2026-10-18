/* The game's instruments (UI v5, "SpaceX telemetry"), drawn in the hero ring's language (lib/ticks.js): lit ticks run
   along the ice ramp, unlit ones fade from .236 to .09, the newest lit tick is the long head, and the glow is a second
   canvas blurred by CSS and added on top (plus-lighter) — no shadowBlur, so a redraw stays cheap inside the game loop.
   - The cluster (createTelemetry): one canvas pair over a 966 × 144 box at the bottom centre.
     · SPEED and ALTITUDE gauges, Ø 144: a 270° arc of 55 ticks open at the bottom. The altitude gauge's open bottom
       holds the thrust budget, 13 short ticks that drain while the jets fire and refill on landing.
     · The mission timeline between them: 55 ticks over 610; nodes at the thirds (blue hour · night · chase) and the
       end (best). The node of a phase just reached flashes.
     It redraws only when what it shows changes (lit counts, the head, the flash), not every frame.
   - The Busted ring (createBustRing): the hero ring's geometry (Ø 377, 89 ticks × 21, head 34) as a display — no
     membrane, no scrub — with the run's distance riding the head like the hero's 000°.
   Numbers and captions are DOM (hud.js); GEO (desktop) and GEO_MOB (stage 9, a phone held upright: the gauges at the
   sides with the clock between them, the timeline across the width under them) are the positions CSS mirrors in
   style.css; the layout follows the PORTRAIT media query and is re-read on every resize. */
import { RAMP, clamp01, rampRGB, rgb, toIce } from '../ticks.js';
import { PORTRAIT } from './config.js';

const DEG = Math.PI / 180;
const INK = [238, 244, 248];
export const GEO = {
  W: 966, H: 144, PAD: 34,                                   // the cluster box; the canvases overhang it by PAD for the glow
  cy: 72, speedX: 72, altX: 894,
  gauge: { r: 72, len: 13, head: 21, n: 55, a0: 135 * DEG, span: 270 * DEG },
  thrust: { n: 13, r: 72, len: 8, a0: 55 * DEG, a1: 125 * DEG },
  line: { x0: 178, w: 610, n: 55, base: 79, len: 13, node: 21, head: 34 },
  nodes: [0, 18, 36, 54],                                    // tick index of each node: the thirds and the end
  headClamp: [199, 767],                                     // the riding distance label stays clear of the gauges
};
export const GEO_MOB = {
  W: 398, H: 226, PAD: 34,
  cy: 60, speedX: 60, altX: 338,
  gauge: { r: 60, len: 11, head: 17, n: 55, a0: 135 * DEG, span: 270 * DEG },
  thrust: { n: 13, r: 60, len: 7, a0: 55 * DEG, a1: 125 * DEG },
  line: { x0: 0, w: 398, n: 55, base: 170, len: 11, node: 17, head: 28 },
  nodes: [0, 18, 36, 54],
  headClamp: [36, 362],
};
const q = (v, n) => Math.round(v * n);

export function createTelemetry(el) {
  const ticks = el.querySelector('[data-tele-ticks]'), bloom = el.querySelector('[data-tele-bloom]');
  const ctx = ticks.getContext('2d'), btx = bloom.getContext('2d');
  const portrait = matchMedia(PORTRAIT);
  let L = GEO, BW = 0, BH = 0, s = 1, dpr = 1, key = '', state = null, redraws = 0;

  const stroke = (g, x1, y1, x2, y2, color, w) => { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  const tick = (x1, y1, x2, y2, c, a = 1, glow = 0, gw = 5) => {
    stroke(ctx, x1, y1, x2, y2, rgb(c, a), 2);
    if (glow > 0) stroke(btx, x1, y1, x2, y2, rgb(c, glow), gw);
  };
  const unlit = (i, lit, n) => .236 - .146 * ((i - lit) / Math.max(1, n - lit));

  function gauge(cx, lit) {
    const { r, len, head, n, a0, span } = L.gauge, cy = L.cy;
    for (let i = 0; i < n; i++) {
      const a = a0 + span * i / (n - 1), cos = Math.cos(a), sin = Math.sin(a);
      const r1 = r - len, r2 = lit > 0 && i === lit - 1 ? r1 + head : r;
      const x1 = cx + cos * r1, y1 = cy + sin * r1, x2 = cx + cos * r2, y2 = cy + sin * r2;
      if (i < lit) tick(x1, y1, x2, y2, rampRGB(lit > 1 ? i / (lit - 1) : 1), 1, .618);
      else tick(x1, y1, x2, y2, INK, unlit(i, lit, n).toFixed(3));
    }
  }

  function thrust(cx, left, firing) {
    const { n, r, len, a0, a1 } = L.thrust, cy = L.cy;
    for (let i = 0; i < n; i++) {
      const a = a1 - (a1 - a0) * i / (n - 1), cos = Math.cos(a), sin = Math.sin(a);   // left to right along the bottom
      const x1 = cx + cos * (r - len), y1 = cy + sin * (r - len), x2 = cx + cos * r, y2 = cy + sin * r;
      if (i < left) tick(x1, y1, x2, y2, firing ? RAMP[3] : RAMP[2], firing ? 1 : .618, firing ? .618 : 0);
      else tick(x1, y1, x2, y2, INK, .09);
    }
  }

  function timeline(lit, flashNode, flash) {
    const { x0, w, n, base, len, node, head } = L.line;
    for (let i = 0; i < n; i++) {
      const x = x0 + w * i / (n - 1), ni = L.nodes.indexOf(i);
      const h = lit > 0 && i === lit - 1 ? head : ni >= 0 ? node : len;
      if (i < lit) {
        let c = rampRGB(lit > 1 ? i / (lit - 1) : 1);
        if (ni >= 0 && ni === flashNode && flash > 0) {
          c = toIce(c, flash);
          stroke(btx, x, base - h - 8 * flash, x, base + 8 * flash, rgb(RAMP[3], (.618 * flash).toFixed(3)), 13);
        }
        tick(x, base - h, x, base, c, 1, .618);
      } else tick(x, base - h, x, base, INK, ni >= 0 ? .382 : unlit(i, lit, n).toFixed(3));
    }
  }

  function paint() {
    redraws++;
    for (const g of [ctx, btx]) {
      g.setTransform(dpr * s, 0, 0, dpr * s, dpr * s * L.PAD, dpr * s * L.PAD);
      g.clearRect(-L.PAD, -L.PAD, BW, BH); g.lineCap = 'round';
    }
    const st = state;
    gauge(L.speedX, st.speedLit);
    gauge(L.altX, st.altLit);
    thrust(L.altX, st.thrustLit, st.firing);
    timeline(st.lineLit, st.flashNode, st.flash);
  }

  function resize() {
    L = portrait.matches ? GEO_MOB : GEO;
    BW = L.W + L.PAD * 2; BH = L.H + L.PAD * 2;
    key = '';                                                // the layout may have changed: the next draw repaints
    dpr = Math.min(2, devicePixelRatio || 1);
    s = ticks.offsetWidth / BW;
    for (const c of [ticks, bloom]) { c.width = Math.round(ticks.offsetWidth * dpr); c.height = Math.round(ticks.offsetHeight * dpr); }
    if (state && s) paint();
  }
  new ResizeObserver(resize).observe(ticks);
  portrait.addEventListener('change', resize);
  resize();

  return {
    /* speed, alt: 0–1 of full scale · thrust: 0–1 left · line: 0–1 of the timeline, or −1 before the run ·
       flashNode / flash: which node pulses and how hard (0–1). Returns true when it redrew. */
    draw({ speed, alt, thrust: left, firing, line, flashNode = -1, flash = 0 }) {
      const n = L.gauge.n;
      const next = {
        speedLit: speed > 0 ? q(clamp01(speed), n - 1) + 1 : 0,
        altLit: alt > 0 ? q(clamp01(alt), n - 1) + 1 : 0,
        thrustLit: q(clamp01(left), L.thrust.n),
        firing: !!firing,
        lineLit: line < 0 ? 0 : q(clamp01(line), L.line.n - 1) + 1,
        flashNode, flash: Math.round(clamp01(flash) * 21) / 21,
      };
      const k = Object.values(next).join('|');
      if (k === key) return false;
      key = k; state = next;
      if (s) paint();
      return true;
    },
    /* x of the timeline head in cluster units, for the distance label that rides it (kept clear of the edges) */
    headX(line) {
      const { x0, w, n } = L.line;
      const x = x0 + w * (line < 0 ? 0 : q(clamp01(line), n - 1)) / (n - 1);
      return Math.min(L.headClamp[1], Math.max(L.headClamp[0], x));
    },
    resize,
    get redraws() { return redraws; },
  };
}

/* the Busted ring: the hero ring as a display (lib/ring.js geometry) */
const RB = { BOX: 678, R: 188.5, LEN: 21, HEAD: 34, N: 89 };
export function createBustRing(el) {
  const ticks = el.querySelector('[data-bust-ticks]'), bloom = el.querySelector('[data-bust-bloom]');
  const ctx = ticks.getContext('2d'), btx = bloom.getContext('2d');
  const C = RB.BOX / 2;
  let s = 1, dpr = 1, lit = -1, label = '', redraws = 0;

  function paint() {
    redraws++;
    for (const g of [ctx, btx]) { g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0); g.clearRect(0, 0, RB.BOX, RB.BOX); g.lineCap = 'round'; }
    for (let i = 0; i < RB.N; i++) {
      const a = (i / RB.N) * Math.PI * 2 - Math.PI / 2, cos = Math.cos(a), sin = Math.sin(a);
      const r1 = RB.R - RB.LEN, r2 = r1 + (lit > 0 && i === lit - 1 ? RB.HEAD : RB.LEN);
      const x1 = C + cos * r1, y1 = C + sin * r1, x2 = C + cos * r2, y2 = C + sin * r2;
      ctx.lineWidth = 2;
      if (i < lit) {
        const c = rampRGB(lit > 1 ? i / (lit - 1) : 1);
        ctx.strokeStyle = rgb(c);
        btx.strokeStyle = rgb(c, .618); btx.lineWidth = 5;
        btx.beginPath(); btx.moveTo(x1, y1); btx.lineTo(x2, y2); btx.stroke();
      } else ctx.strokeStyle = rgb(INK, (.236 - .146 * (i - lit) / Math.max(1, RB.N - lit)).toFixed(3));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    if (lit > 0 && label) {   // the distance rides just outside the head, like the hero's 000°
      const ha = ((lit - 1) / RB.N) * Math.PI * 2 - Math.PI / 2, hr = RB.R + 34;
      ctx.fillStyle = '#eef4f8';
      ctx.font = '400 13px Oxanium, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, C + Math.cos(ha) * hr, C + Math.sin(ha) * hr);
    }
  }

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    s = el.offsetWidth / RB.BOX;
    for (const c of [ticks, bloom]) { c.width = Math.round(el.offsetWidth * dpr); c.height = Math.round(el.offsetHeight * dpr); }
    if (s) paint();
  }
  new ResizeObserver(resize).observe(el);
  document.fonts.ready.then(() => { if (s) paint(); });
  resize();

  return {
    /* fill 0–1 of the ring; returns true when it redrew */
    set(fill, text = label) {
      const n = Math.round(clamp01(fill) * RB.N);
      if (n === lit && text === label) return false;
      lit = n; label = text;
      if (s) paint();
      return true;
    },
    get lit() { return lit; },
    get redraws() { return redraws; },
  };
}
