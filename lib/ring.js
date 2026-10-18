/* The tick ring v4.3 — a liquid, sticky instrument (the user's ref 3 + their reviews of v4 / v4.1 / stage 4).
   - Turning, not pointing (v4.3): the zone is a circle of Ø 466 (r 233 ≈ 1.24 × R). A fresh contact only records the
     pointer's angle — nothing jumps; from then on the angle the pointer travels round the centre moves the target
     (one clockwise turn = the whole clip, counter-clockwise rewinds, clamped to 0–1). Leaving the zone eases the clip
     back to its first frame, so every approach starts from the start; over the START disc (r < 80) the contact drops
     but the place holds, so START launches from there. The value chases the target with a lerp at k .08 and
     onChange(p) fires every frame it moves. While released (START → the game) the ring ignores the pointer.
   - Contact: while the pointer is on the ring (inside the zone, off the disc) the contact strength k → 1; otherwise,
     and after release() (START), k → 0, so the light and the bulge are gone.
   - Liquid: the ring membrane bulges toward the cursor (the site's white circle, lib/cursor.js): each tick is displaced
     A · exp(−Δθ² / 2σ²), σ 21°, A = (r − R) · .382, clamped ±55, on a spring (stiffness .12, damping .72) that
     overshoots and wobbles back. Past 89 from the ring the membrane lets go and springs back, re-attaching under 55.
     (v4.1's drawn drop and liquid bridge are gone — they read as a triangle and a stray circle.)
   - Light: lit progress ticks run along our ramp with a 21 glow; a sweeping arc of light (±55° around the contact,
     gaussian σ 21°) is drawn on a bloom canvas, blurred 34 and added on top (plus-lighter). Unlit ticks fade from .236
     to .09 and brighten near the contact (σ 55 along the ring).
   - 3D: the group tilts toward the pointer (≤ 5°), lerp .12.
   Keys on the focused ring: ←/→ one tick, Home/End. The ramp and colour helpers live in lib/ticks.js (shared with the
   game's telemetry). */
import { RAMP, clamp01, gauss, rampRGB, rgb, toIce } from './ticks.js';

const N = 89;
const K = .08, KS = .12;
const SPRING = .12, DAMP = .72;
const BOX = 678;                          // the Ø 610 zone + 34 pad, in design units
const C = BOX / 2, R = 188.5, LEN = 21, HEAD = 34;
const R_IN = 80, R_ZONE = 233;
const BULGE = .382, BULGE_MAX = 55, SIG = 21 * Math.PI / 180;
const SNAP = 89, REATTACH = 55, ARC = 55 * Math.PI / 180, NEAR = 55 / R, TILT = 5;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

export function createRing(zone, { onChange = () => {} } = {}) {
  const tilt = zone.querySelector('[data-ring-tilt]');
  const ticks = zone.querySelector('[data-ring-ticks]');
  const bloom = zone.querySelector('[data-ring-bloom]');
  const ctx = ticks.getContext('2d'), btx = bloom.getContext('2d');
  let s = 1, dpr = 1, target = 0, current = 0, raf = 0, prevA = null, live = true;
  /* pointer (design units from the centre), contact spring, strength, tilt */
  const ptr = { x: 0, y: 0, r: 0, on: false };
  const ang = { x: -Math.PI / 2, v: 0, t: -Math.PI / 2 };
  const amp = { x: 0, v: 0, t: 0 };
  const str = { x: 0, t: 0 };
  let attached = true;                       // the membrane holds the cursor; lets go past SNAP
  const tl = { x: 0, y: 0, tx: 0, ty: 0 };

  const bulgeAt = (theta) => amp.x * gauss(angDiff(ang.x, theta), SIG);

  function draw() {
    for (const g of [ctx, btx]) { g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0); g.clearRect(0, 0, BOX, BOX); g.lineCap = 'round'; }
    const lit = Math.floor(current * N);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU - Math.PI / 2, cos = Math.cos(a), sin = Math.sin(a);
      const d = bulgeAt(a);
      const len = lit > 0 && i === lit - 1 ? HEAD : LEN;
      const r1 = R - LEN + d, r2 = r1 + len;
      const x1 = C + cos * r1, y1 = C + sin * r1, x2 = C + cos * r2, y2 = C + sin * r2;
      const near = str.x * gauss(angDiff(ang.x, a), NEAR);
      ctx.lineWidth = 2;
      if (i < lit) {
        const c = toIce(rampRGB(lit > 1 ? i / (lit - 1) : 1), near);
        ctx.strokeStyle = rgb(c); ctx.shadowColor = rgb(c); ctx.shadowBlur = 21 * s * dpr;
        btx.strokeStyle = rgb(c, .618); btx.lineWidth = 5;
        btx.beginPath(); btx.moveTo(x1, y1); btx.lineTo(x2, y2); btx.stroke();
      } else {
        const far = (i - lit) / Math.max(1, N - lit);
        ctx.strokeStyle = rgb([238, 244, 248], Math.min(1, .236 - .146 * far + .618 * near).toFixed(3));
        ctx.shadowColor = rgb(RAMP[2]); ctx.shadowBlur = near > .05 ? 13 * s * dpr * near : 0;
      }
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    /* the sweeping arc of light along the ring around the contact */
    if (str.x > .01) {
      btx.lineWidth = 34;
      const step = 2 * Math.PI / 180;
      for (let o = -ARC; o < ARC; o += step) {
        const w = gauss(o, SIG) * str.x;
        if (w < .02) continue;
        const a0 = ang.x + o, a1 = a0 + step;
        const r0 = R - LEN / 2 + bulgeAt(a0), r1 = R - LEN / 2 + bulgeAt(a1);
        btx.strokeStyle = rgb(toIce(RAMP[2], w), .618 * w);
        btx.beginPath(); btx.moveTo(C + Math.cos(a0) * r0, C + Math.sin(a0) * r0); btx.lineTo(C + Math.cos(a1) * r1, C + Math.sin(a1) * r1); btx.stroke();
      }
    }
    /* the orbit angle rides just outside the head */
    const ha = current * TAU - Math.PI / 2, hr = R + 21 + bulgeAt(ha);
    ctx.fillStyle = '#eef4f8';
    ctx.font = '400 13px Oxanium, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${String(Math.round(current * 360)).padStart(3, '0')}°`, C + Math.cos(ha) * hr, C + Math.sin(ha) * hr);
  }

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    s = tilt.offsetWidth / BOX;                  // layout width: the 3D tilt must not skew the scale
    for (const c of [ticks, bloom]) { c.width = Math.round(tilt.offsetWidth * dpr); c.height = Math.round(tilt.offsetHeight * dpr); }
    if (tilt.offsetWidth) draw();
  }

  const spring = (o, diff) => { o.v = (o.v + diff * SPRING) * DAMP; return o.v; };

  /* one frame of every inertia and spring; returns true while anything still moves */
  function advance() {
    current += (target - current) * K;
    if (Math.abs(target - current) < .0005) current = target;
    ang.x += spring(ang, angDiff(ang.x, ang.t));
    amp.x += spring(amp, amp.t - amp.x);
    str.x += (str.t - str.x) * KS;
    tl.x += (tl.tx - tl.x) * KS;
    tl.y += (tl.ty - tl.y) * KS;
    if (Math.abs(str.t - str.x) < .002) str.x = str.t;
    tilt.style.transform = `perspective(calc(var(--u) * 987)) rotateX(${tl.x.toFixed(2)}deg) rotateY(${tl.y.toFixed(2)}deg)`;
    draw();
    zone.setAttribute('aria-valuenow', Math.round(current * 360));
    onChange(current);
    return current !== target || Math.abs(ang.v) > 1e-4 || Math.abs(angDiff(ang.x, ang.t)) > 1e-3
      || Math.abs(amp.v) > .01 || Math.abs(amp.t - amp.x) > .05 || str.x !== str.t
      || Math.abs(tl.tx - tl.x) > .01 || Math.abs(tl.ty - tl.y) > .01;
  }
  const tick = () => { raf = advance() ? requestAnimationFrame(tick) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const setTarget = (p) => { target = clamp01(p); kick(); };

  function off() {
    ptr.on = false; prevA = null;
    str.t = 0; amp.t = 0; tl.tx = tl.ty = 0;
    zone.classList.remove('is-scrubbing');
  }

  zone.addEventListener('pointermove', (e) => {
    if (!live) return;
    const b = zone.getBoundingClientRect();
    const dx = (e.clientX - (b.left + b.width / 2)) / s, dy = (e.clientY - (b.top + b.height / 2)) / s;
    const r = Math.hypot(dx, dy);
    if (r > R_ZONE) { off(); if (e.pointerType !== 'touch') setTarget(0); return; }   // left the zone: back to the first frame (a finger holds)
    if (r < R_IN) { off(); kick(); return; }                  // over the START disc: the light goes, the place holds
    const a = Math.atan2(dy, dx);
    if (!ptr.on) { ang.x = a; ang.v = 0; amp.x = 0; amp.v = 0; attached = true; prevA = a; }   // a fresh contact: nothing jumps
    ptr.on = true; ptr.x = dx; ptr.y = dy; ptr.r = r;
    zone.classList.add('is-scrubbing');
    str.t = 1;
    ang.t = a;
    tl.tx = -(dy / R_ZONE) * TILT; tl.ty = (dx / R_ZONE) * TILT;
    /* the membrane lets go beyond SNAP from the ring and grabs again under REATTACH */
    const gap = Math.abs(r - R);
    if (attached && gap > SNAP) attached = false;
    else if (!attached && gap < REATTACH) attached = true;
    amp.t = attached ? clamp((r - R) * BULGE, -BULGE_MAX, BULGE_MAX) : 0;
    const turned = angDiff(prevA, a);                          // the angle travelled since the last move (±π)
    prevA = a;
    setTarget(target + turned / TAU);
  });
  zone.addEventListener('pointerleave', (e) => { if (!live) return; off(); if (e.pointerType !== 'touch') setTarget(0); });   // a lifted finger holds the frame
  zone.addEventListener('keydown', (e) => {
    if (!live) return;
    const step = { ArrowRight: 1 / N, ArrowUp: 1 / N, ArrowLeft: -1 / N, ArrowDown: -1 / N }[e.key];
    if (step) setTarget(target + step);
    else if (e.key === 'Home') setTarget(0);
    else if (e.key === 'End') setTarget(1);
    else return;
    e.preventDefault(); e.stopPropagation();
  });

  new ResizeObserver(resize).observe(tilt);
  document.fonts.ready.then(draw);
  resize();

  return {
    set: setTarget,
    /* START / leaving the hero: drop the contact at once so nothing stays lit or bent */
    release() {
      live = false;
      off();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }   // no more frames: a late onChange would scrub the clip under the launch
      str.x = 0; amp.x = 0; amp.v = 0; ang.v = 0; tl.x = tl.y = 0;
      tilt.style.transform = 'none';
      draw();
    },
    /* back on the hero: the pointer drives the ring again */
    engage() { live = true; },
    get value() { return current; },
    get target() { return target; },
    get lit() { return Math.floor(current * N); },
    get k() { return Math.round(str.x * 1000) / 1000; },
    get bulge() { return { amp: Math.round(amp.x * 100) / 100, deg: Math.round(((ang.x + Math.PI / 2) / TAU * 360 + 360) % 360) }; },
    get attached() { return attached && ptr.on; },
    get tilt() { return { x: Math.round(tl.x * 100) / 100, y: Math.round(tl.y * 100) / 100 }; },
    /* dev: advance every inertia and spring n frames synchronously; trace = amplitude per frame */
    step(n = 1, trace = null) { for (let i = 0; i < n; i++) { const moving = advance(); if (trace) trace.push(Math.round(amp.x * 100) / 100); if (!moving) break; } return current; },
  };
}
