/* Canvas renderer. Every sprite is one draw function over the sprite's own box (units, y from the top). The stage-3
   images (lib/game/sprites.js) draw into those boxes once decoded; until then, or if one fails, the v2 placeholder
   shapes stand in. Glows, light bars, rotor blur and contact shadows stay in canvas.
   Units → px: S = min(W / 600, H / 390); the road is at 76.4 % of the height, the car at 14.6 % of the width. */
import { C, PORTRAIT } from './config.js';
import { createRng } from './rng.js';
import { playerBoxes, obstacleBoxes } from './collide.js';
import { CRASHED, BUSTED, NOZZLES } from './game.js';
import { SPRITES, GEO, PLATES, BG } from './sprites.js';

const SKY = [
  ['#080a12', '#1e2848'],   // blue hour: indigo-navy, after the hero clip (stage 4); was teal #0a0f13 → #2a556c
  ['#080808', '#152832'],   // star night
  ['#080808', '#152832'],   // pursuit (+ the light wash)
];
const RIDGE = '#10202a', PROPS = '#0a1218', ROAD = '#080808';
const ICE = '#cfe2ef', FG = '#eef4f8', DARK = '#0b151c', GLASS = '#152832';
const SIGNAL = '#ff2a3d', STEEL = '#4f86a5';
const ink = (a) => `rgba(238, 244, 248, ${a})`;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - Math.pow(1 - t, 3);

/* silhouettes, car units, y from the top. The Roadster faces right; police face left (oncoming). */
const CAR_BODY = [[0, 27], [0, 14], [14, 10], [40, 4], [58, 3], [80, 10], [104, 16], [120, 21], [118, 26], [110, 28], [8, 28]];
const CAR_GLASS = [[16, 11], [40, 5.2], [58, 4.3], [77, 10.4], [70, 13], [22, 13]];
const CAR_WING = [[-2, 3], [16, 2], [16, 4], [-2, 5]];
const CAR_WHEELS = [26, 96];          // centres x; y 26, r 6
const POLICE_BODY = [[0, 30], [0, 21], [4, 18], [26, 16], [36, 7], [70, 6], [84, 15], [104, 17], [104, 30]];
const POLICE_GLASS = [[29, 15], [38, 8.6], [68, 8.2], [80, 15]];
const POLICE_WHEELS = [20, 84];       // y 30, r 6

export function createRenderer(canvas, game, { debug = false } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, S = 1, groundY = 0;

  /* seeded scenery: stars, a periodic ridge (1200 u), poles and rocks (987 u) */
  const rng = createRng(17);
  const stars = Array.from({ length: 144 }, () => ({ x: rng() * 1597, y: rng(), r: rng() < .13 ? 1.6 : .9, a: .236 + rng() * .382 }));
  const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const ridgeH = (x) => 34 + 21 * Math.sin((x / 1200) * 6.283 * 3 + ph[0]) + 13 * Math.sin((x / 1200) * 6.283 * 7 + ph[1]) + 5 * Math.sin((x / 1200) * 6.283 * 17 + ph[2]);
  const props = [];
  for (let x = 0; x < 987; x += 89 + Math.floor(rng() * 89)) props.push({ x, kind: rng() < .55 ? 'pole' : 'rock', h: 34 + rng() * 34, w: 13 + rng() * 21 });

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const portrait = matchMedia(PORTRAIT).matches;               // stage 9: the full 600-unit road across a phone's width
    S = portrait ? W / C.FIELD_W : Math.min(W / C.FIELD_W, H / C.FIELD_H);
    groundY = H * (portrait ? C.GROUND_PORTRAIT : C.GROUND);
    vignette = null;                                   // rebuilt for the new size on the next frame
    game.setView(W / S);
    if (ready) render(1);   // resizing clears the canvas: redraw now, not on the next frame (the loop may be paused)
  }
  /* the film grade over everything (stage 4), matched to the hero clip by numbers: a soft-light warm mauve that takes
     the teal out (green and blue down more than red, so the navy turns indigo-violet like the clip), a multiply
     vignette that deepens the corners, and live grain from one noise tile drawn as an overlay at a new offset every
     frame */
  /* fitted to the clip's night end frame (shadows [8, 11, 19], mids [17, 20, 31]): blue hour now measures shadows
     [9, 11, 19], mids [18, 21, 35] (was [12, 20, 27] / [22, 38, 51], teal) */
  const GRADE = { tint: [135, 95, 95], tintA: .4, vig: [150, 150, 168], vigIn: .38, grain: .07 };
  const grainTile = document.createElement('canvas');
  grainTile.width = grainTile.height = 256;
  {
    const gx = grainTile.getContext('2d'), img = gx.createImageData(256, 256), nrng = createRng(29);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (nrng() + nrng() + nrng() - 1.5) * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gx.putImageData(img, 0, 0);
  }
  const grainPat = ctx.createPattern(grainTile, 'repeat');
  let vignette = null;

  let ready = false;
  new ResizeObserver(resize).observe(canvas);
  resize();
  ready = true;

  const X = (u) => u * S;
  const Y = (h) => groundY - h * S;
  const poly = (pts, ox, oy, flip = false, w = 0) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const px = ox + X(flip ? w - x : x), py = oy + y * S; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath();
  };

  function sky(phase, a) {
    if (a <= 0) return;
    const [top, hor] = SKY[phase];
    const gr = ctx.createLinearGradient(0, 0, 0, groundY);
    gr.addColorStop(0, top); gr.addColorStop(1, hor);
    ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, groundY); ctx.globalAlpha = 1;
  }

  /* one looping plate: scrolled by `off` units, its bottom edge at `bottom` px, `hU` units tall; tiles overlap by a
     pixel so no hairline shows between them. r0–r1 draws only those rows (0–1) of it, at the same scale. */
  function band(img, off, bottom, hU, r0 = 0, r1 = 1) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const full = hU * S, w = (full * iw) / ih, h = full * (r1 - r0);
    for (let x = -((((off * S) % w) + w) % w); x < W; x += w) ctx.drawImage(img, 0, ih * r0, iw, ih * (r1 - r0), Math.floor(x), bottom - h, Math.ceil(w) + 1, h);
  }

  /* UI v5.1, under the telemetry: below the road's pale edge line the scrub goes soft and dark. `soft` is the ground
     plate blurred once (wrapped sideways so the loop stays seamless) and faded in down the plate, sharp at the line,
     fully soft from SOFT.full; a dark gradient then runs from the line to the bottom. Drawn under the cars and the
     grade, so the film grain stays sharp on top. */
  const SOFT = { blur: 6, full: .62, dark: [0, .382, .786] };   // blur in plate px (≈ 3.7 px on screen)
  let soft = null, shade = null, shadeKey = '';
  function makeSoft(img) {
    const w = img.naturalWidth, h = img.naturalHeight, pad = 34;
    const tmp = document.createElement('canvas'); tmp.width = w + pad * 2; tmp.height = h + pad * 2;
    const t = tmp.getContext('2d');
    for (const dx of [-w, 0, w]) {
      t.drawImage(img, pad + dx, pad);
      t.drawImage(img, 0, h - 2, w, 2, pad + dx, pad + h, w, pad);   // the bottom row runs on, so the blur keeps it opaque
    }
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d');
    o.filter = `blur(${SOFT.blur}px)`;                     // where canvas filters are missing it stays sharp, still dark
    o.drawImage(tmp, -pad, -pad);
    o.filter = 'none';
    o.globalCompositeOperation = 'destination-in';
    const m = o.createLinearGradient(0, h * BG.line, 0, h * SOFT.full);
    m.addColorStop(0, 'rgba(0, 0, 0, 0)'); m.addColorStop(1, '#000');
    o.fillStyle = m; o.fillRect(0, 0, w, h);
    return out;
  }
  function ground(off, edge) {
    const img = PLATES.ground.img, hU = BG.groundH, bottom = edge + hU * S, half = hU * S / 2;
    if (!soft) soft = makeSoft(img);
    for (const layer of [img, soft]) {
      band(layer, off, bottom, hU);
      /* the scrub runs on below: its lower half mirrored, then straight, … so every join meets the same row (no seam) */
      let flip = true;
      for (let top = bottom; top < H; top += half, flip = !flip) {
        if (flip) { ctx.save(); ctx.translate(0, 2 * top + half); ctx.scale(1, -1); }
        band(layer, off, top + half, hU, .5, 1);
        if (flip) ctx.restore();
      }
    }
    const line = edge + hU * S * BG.line, key = `${line}|${H}`;
    if (key !== shadeKey) {
      shade = ctx.createLinearGradient(0, line, 0, H);
      SOFT.dark.forEach((v, i) => shade.addColorStop(i / (SOFT.dark.length - 1), `rgba(8, 8, 8, ${v})`));
      shadeKey = key;
    }
    ctx.fillStyle = shade; ctx.fillRect(0, line, W, H - line);
  }

  function scenery(w, a) {
    const p = game.g.prev;
    const fade = ease(w.fade);
    sky(w.prevPhase, 1);
    sky(w.phase, fade);
    const night = (w.phase >= 1 ? fade : 0) + (w.prevPhase >= 1 ? 1 - fade : 0);   // 0 at blue hour, 1 at night
    if (PLATES.sky.ok && PLATES.far.ok && PLATES.mid.ok && PLATES.ground.ok) {
      /* the sky: static, covering everything above the road, its hazy bottom on the horizon; at blue hour it is faint
         over the phase gradient (few stars), at night it is the whole sky */
      const img = PLATES.sky.img, k = Math.max(W / img.naturalWidth, groundY / img.naturalHeight);
      const sw = img.naturalWidth * k, sh = img.naturalHeight * k;
      ctx.globalAlpha = .382 + .618 * night;
      ctx.drawImage(img, (W - sw) / 2, groundY - sh, sw, sh);
      ctx.globalAlpha = 1;
      const edge = groundY - BG.roadUp * S;                        // the road's far edge
      band(PLATES.far.img, lerp(p.far, w.far, a), edge + BG.tuck * S, BG.farH);
      band(PLATES.mid.img, lerp(p.mid, w.mid, a), edge + BG.tuck * S, BG.midH);
      /* horizon haze over the ridges: lifts them at blue hour, a trace at night */
      const top = edge - BG.farH * S, hz = ctx.createLinearGradient(0, top, 0, edge);
      hz.addColorStop(0, 'rgba(86, 98, 160, 0)'); hz.addColorStop(1, `rgba(86, 98, 160, ${.09 * (1 - night) + .03})`);
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = hz; ctx.fillRect(0, top, W, edge - top);
      ctx.globalCompositeOperation = 'source-over';
      ground(lerp(p.ground, w.ground, a), edge);
    } else placeholderScenery(w, a, p, night);
    /* pursuit: a slow red / blue wash over the scene (in-game only) */
    const pursuit = (w.phase === 2 ? fade : 0);
    if (pursuit > 0) {
      const t = game.g.frame / C.FPS;
      const s = .5 + .5 * Math.sin(t * 6.283);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 42, 61, ${.08 * s * pursuit})`; ctx.fillRect(0, 0, W, groundY);
      ctx.fillStyle = `rgba(79, 134, 165, ${.08 * (1 - s) * pursuit})`; ctx.fillRect(0, 0, W, groundY);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* the v2 placeholder scenery: drawn stars, a sine ridge, poles and rocks, a flat road with lane dashes */
  function placeholderScenery(w, a, p, night) {
    if (night > 0) {
      const off = lerp(p.sky, w.sky, a);
      ctx.fillStyle = FG;
      for (const s of stars) {
        const x = (((s.x - off) % 1597) + 1597) % 1597 / 1597 * W * 1.1 - W * .05;
        ctx.globalAlpha = s.a * night;
        ctx.fillRect(x, s.y * groundY * .8, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }
    /* far ridge */
    const far = lerp(p.far, w.far, a);
    ctx.fillStyle = RIDGE;
    ctx.beginPath(); ctx.moveTo(0, groundY);
    for (let u = 0; u <= W / S + 13; u += 8) ctx.lineTo(X(u), Y(ridgeH(u + far)));
    ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
    /* mid props */
    const mid = lerp(p.mid, w.mid, a);
    ctx.fillStyle = PROPS;
    for (let rep = 0; rep < 4; rep++) {
      for (const it of props) {
        const u = it.x + rep * 987 - (mid % 987);
        if (u < -55 || u > W / S + 55) continue;
        if (it.kind === 'pole') {
          ctx.fillRect(X(u), Y(it.h), Math.max(1, X(1.5)), it.h * S);
          ctx.fillRect(X(u - 8), Y(it.h - 3), X(17), Math.max(1, X(1.2)));
        } else {
          ctx.beginPath(); ctx.moveTo(X(u), groundY); ctx.lineTo(X(u + it.w * .3), Y(it.h * .2)); ctx.lineTo(X(u + it.w * .7), Y(it.h * .26)); ctx.lineTo(X(u + it.w), groundY); ctx.closePath(); ctx.fill();
        }
      }
    }
    /* road */
    ctx.fillStyle = ROAD; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = ink(.146); ctx.fillRect(0, groundY, W, 1);
    const ground = lerp(p.ground, w.ground, a);
    const laneY = groundY + (H - groundY) * .382;
    for (let u = -(ground % 89); u < W / S; u += 89) ctx.fillRect(X(u), laneY, X(34), Math.max(1, X(1)));
  }

  function wheel(cx, cy, r, angle) {
    ctx.fillStyle = '#080808'; ctx.beginPath(); ctx.arc(cx, cy, r * S, 0, 6.283); ctx.fill();
    ctx.fillStyle = GLASS; ctx.beginPath(); ctx.arc(cx, cy, r * .62 * S, 0, 6.283); ctx.fill();
    ctx.strokeStyle = ink(.382); ctx.lineWidth = Math.max(1, S * .6);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const t = angle + (i * 6.283) / 6; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(t) * r * .6 * S, cy + Math.sin(t) * r * .6 * S); }
    ctx.stroke();
  }

  function lightBar(x, y, w, t, glow = true, h = 3.5 * S, flip = false) {
    const on = Math.floor(t * 4) % 2 === 0;
    const rx = flip ? x + w / 2 : x, bx = flip ? x : x + w / 2;   // red half first, mirrored on the chaser
    ctx.fillStyle = on ? SIGNAL : '#3a1015'; ctx.fillRect(rx, y, w / 2, h);
    ctx.fillStyle = on ? '#1c3a4c' : STEEL; ctx.fillRect(bx, y, w / 2, h);
    if (!glow) return;
    const gx = on ? rx + w * .25 : bx + w * .25;
    const gr = ctx.createRadialGradient(gx, y, 0, gx, y, 34 * S);
    gr.addColorStop(0, on ? 'rgba(255, 42, 61, .38)' : 'rgba(79, 134, 165, .38)'); gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = gr;
    ctx.fillRect(gx - 34 * S, y - 34 * S, 68 * S, 68 * S);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* a soft contact shadow on the road line, centred at cx, rw px wide each side */
  function shadow(cx, rw, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.translate(cx, groundY); ctx.scale(1, .06);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
    gr.addColorStop(0, `rgba(0, 0, 0, ${.618 * a})`); gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gr; ctx.fillRect(-rw, -rw, rw * 2, rw * 2);
    ctx.restore();
  }

  /* police car, facing left; flip = facing right (the chaser) */
  function police(ox, flip, t) {
    const top = Y(C.POLICE.h);
    if (SPRITES.police.ok) {
      const w = X(C.POLICE.w), b = GEO.bar;
      shadow(ox + w / 2, w * .55, 1);
      ctx.save();
      if (flip) { ctx.translate(ox + w, top); ctx.scale(-1, 1); } else ctx.translate(ox, top);
      ctx.drawImage(SPRITES.police.img, 0, 0, w, C.POLICE.h * S);
      ctx.restore();
      lightBar(ox + X(flip ? C.POLICE.w - b.x - b.w : b.x), top + b.y * S, X(b.w), t, true, b.h * S, flip);
      return;
    }
    ctx.fillStyle = DARK; poly(POLICE_BODY, ox, top, flip, C.POLICE.w); ctx.fill();
    ctx.fillStyle = '#1e3644'; poly(POLICE_GLASS, ox, top, flip, C.POLICE.w); ctx.fill();
    ctx.fillStyle = 'rgba(79, 134, 165, .618)'; ctx.fillRect(ox + X(2), top + 21 * S, X(100), 1.5 * S);
    for (const wx of POLICE_WHEELS) wheel(ox + X(flip ? C.POLICE.w - wx : wx), top + 30 * S, 6, 0);
    lightBar(ox + X(flip ? C.POLICE.w - 64 : 46), top + 2.5 * S, X(18), t);
  }

  /* the fuel truck (stage 6), facing left like the police; its DRL and tail light are in the image */
  function tanker(ox) {
    const T = C.TANKER, top = Y(T.h), w = X(T.w);
    if (SPRITES.tanker.ok) {
      shadow(ox + w / 2, w * .55, 1);
      ctx.drawImage(SPRITES.tanker.img, ox, top, w, T.h * S);
      return;
    }
    ctx.fillStyle = DARK;
    ctx.fillRect(ox + X(4), top + 36 * S, X(226), 36 * S);           // chassis and bed
    ctx.fillRect(ox + X(6), top + 6 * S, X(52), 60 * S);             // cab
    ctx.fillStyle = '#4a1c1f';
    for (let bx = 62; bx < 222; bx += 16.2) ctx.fillRect(ox + X(bx), top + 9 * S, X(14.6), 27 * S);   // barrels
    for (const wx of [40, 168, 196]) wheel(ox + X(wx), top + 70 * S, 9, 0);
  }

  /* the delivery courier (stage 7b), facing right: we overtake him. A small ride bob; the hit boxes do not move */
  function courier(o, ox, t) {
    const K = C.COURIER, bob = Math.sin(t * 17 + o.seed * 6.28) * .35 * S;
    const top = Y(K.h) + bob, w = X(K.w);
    shadow(ox + w / 2, w * .55, 1);
    if (SPRITES.courier.ok) { ctx.drawImage(SPRITES.courier.img, ox, top, w, K.h * S); return; }
    ctx.fillStyle = DARK;
    ctx.fillRect(ox + X(2), top + 27 * S, X(40), 9 * S);              // the moped
    ctx.fillRect(ox + X(15), top + 6 * S, X(9), 24 * S);              // the rider
    ctx.beginPath(); ctx.arc(ox + X(19.5), top + 5 * S, 4.5 * S, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#24452f'; ctx.fillRect(ox + X(4), top + 9 * S, X(10), 18 * S);   // the green box
    for (const wx of [8, 37]) wheel(ox + X(wx), top + 38 * S, 4.4, 0);
  }

  function drone(o, x, t) {
    const bob = Math.sin(t * 5 + o.seed * 6.28) * 1.2;
    const top = Y(o.y0 + C.DRONE.h + bob);
    if (SPRITES.drone.ok) {
      ctx.drawImage(SPRITES.drone.img, x, top, X(C.DRONE.w), C.DRONE.h * S);
      ctx.fillStyle = ink(.146);                                   // the stopped props read as spinning discs
      for (const p of GEO.props) { ctx.beginPath(); ctx.ellipse(x + X(p.x), top + p.y * S, p.r * S, .9 * S, 0, 0, 6.283); ctx.fill(); }
      const on = Math.floor(t * 4 + o.seed * 4) % 2 === 0;
      ctx.globalCompositeOperation = 'screen';
      for (const l of GEO.leds) {
        const lit = (l.c === 'red') === on, lx = x + X(l.x), ly = top + l.y * S;
        const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, 13 * S);
        gr.addColorStop(0, l.c === 'red' ? `rgba(255, 42, 61, ${lit ? .618 : .09})` : `rgba(79, 134, 165, ${lit ? .618 : .09})`);
        gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gr; ctx.fillRect(lx - 13 * S, ly - 13 * S, 26 * S, 26 * S);
      }
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    ctx.strokeStyle = DARK; ctx.lineWidth = Math.max(1, S * 1.2);
    ctx.beginPath(); ctx.moveTo(x + X(4), top + 5 * S); ctx.lineTo(x + X(32), top + 5 * S); ctx.stroke();
    ctx.fillStyle = ink(.382);
    for (const rx of [4, 32]) { ctx.beginPath(); ctx.ellipse(x + X(rx), top + 3 * S, 7 * S, 1.2 * S, 0, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = DARK; ctx.beginPath(); ctx.roundRect(x + X(12), top + 4 * S, X(12), 6 * S, 2 * S); ctx.fill();
    const on = Math.floor(t * 4 + o.seed * 4) % 2 === 0;
    ctx.fillStyle = on ? SIGNAL : STEEL; ctx.fillRect(x + X(17), top + 10 * S, X(2), 1.5 * S);
  }

  function jets(px, py, p) {
    if (!p.airborne) return;
    /* a thrust pulse (stage 7) kicks all four jets long for 8 frames: 1.618 → 1 */
    const k = p.kick > 0 ? 1 + .618 * (p.kick / 8) : p.thrusting ? 1 : p.vy > 0 ? .5 : .236;
    if (SPRITES.jet.ok) {
      const len = (13 + 34 * k) * S, wid = len * GEO.jetAspect;
      const shear = (-game.g.world.speed * 1.3 * S) / len;        // the plume trails back with the speed
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.min(1, (.382 + .618 * k) * (.9 + .1 * Math.sin(game.g.frame * 1.7)));
      for (const n of GEO.nozzles) {
        ctx.save();
        ctx.translate(px + X(n.x), py + n.y * S); ctx.transform(1, 0, shear, 1, 0, 0);
        ctx.drawImage(SPRITES.jet.img, -wid / 2, 0, wid, len);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    const len = (13 + 34 * k) * S, skew = -game.g.world.speed * 1.3 * S;
    for (const nx of NOZZLES) {
      const x = px + X(nx), y = py + 29 * S;
      const gr = ctx.createLinearGradient(x, y, x + skew, y + len);
      gr.addColorStop(0, ink(.618 * k + .146)); gr.addColorStop(1, ink(0));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(x - 2 * S, y); ctx.lineTo(x + 2 * S, y); ctx.lineTo(x + skew + 8 * S, y + len); ctx.lineTo(x + skew - 8 * S, y + len); ctx.closePath(); ctx.fill();
    }
  }

  /* the Roadster with its jets, tilted about the middle of its bottom edge; the jets are fixed to the car */
  function roadster(px, py, p) {
    const h = C.CAR.h * S, cx = px + X(C.CAR.w / 2);
    shadow(cx, X(C.CAR.w) * .5, 1 - Math.min(1, p.y / 55));
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, groundY + S); ctx.clip();   // low over the road the jets end at the road line
    ctx.translate(cx, py + h);
    ctx.rotate((-p.tilt * Math.PI) / 180);
    ctx.translate(-cx, -(py + h));
    jets(px, py, p);
    if (SPRITES.body.ok) {
      ctx.drawImage(SPRITES.body.img, px, py, X(C.CAR.w), h);
      const st = GEO.stamp, k = SPRITES.body.img.naturalWidth / C.CAR.w;   // image px per unit
      for (const n of GEO.nozzles) {
        if (n.top === undefined) continue;                             // the front pair: stamped from the rear nozzle
        ctx.drawImage(SPRITES.body.img, st.x * k, st.y * k, st.w * k, st.h * k, px + X(n.x - st.w / 2), py + n.top * S, X(st.w), st.h * S);
      }
      if (SPRITES.wheel.ok) {
        const r = GEO.disc * S;
        for (const w of GEO.wheels) {
          ctx.save();
          ctx.translate(px + X(w.x), py + w.y * S); ctx.rotate(p.wheel);
          ctx.drawImage(SPRITES.wheel.img, -r, -r, r * 2, r * 2);
          ctx.restore();
        }
      }
      ctx.restore();
      return;
    }
    const gr = ctx.createLinearGradient(0, py, 0, py + 28 * S);
    gr.addColorStop(0, FG); gr.addColorStop(1, '#9cc0d6');
    ctx.fillStyle = gr; poly(CAR_BODY, px, py); ctx.fill();
    ctx.fillStyle = GLASS; poly(CAR_GLASS, px, py); ctx.fill();
    ctx.fillStyle = '#0a0f13'; ctx.fillRect(px + X(4), py + 24.5 * S, X(112), 3.5 * S);           // sills
    ctx.fillStyle = ICE; poly(CAR_WING, px, py); ctx.fill();
    ctx.fillRect(px + X(6), py + 3.5 * S, X(1.6), 7 * S);                                          // wing stand
    ctx.fillStyle = SIGNAL; ctx.fillRect(px, py + 15 * S, X(1.2), 3 * S);                            // tail bar
    ctx.fillStyle = FG; ctx.fillRect(px + X(117.5), py + 20 * S, X(2.5), 1.2 * S);                   // LED bar
    ctx.fillStyle = '#080808';
    for (const nx of NOZZLES) ctx.fillRect(px + X(nx - 2), py + 27.5 * S, X(4), 2.5 * S);          // nozzles
    for (const wx of CAR_WHEELS) wheel(px + X(wx), py + 26 * S, 6, p.wheel);
    ctx.restore();
  }

  function grade(frame) {
    const G = GRADE;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(${G.tint[0]}, ${G.tint[1]}, ${G.tint[2]}, ${G.tintA})`; ctx.fillRect(0, 0, W, H);
    if (!vignette) {
      vignette = ctx.createRadialGradient(W / 2, H / 2, Math.hypot(W, H) * G.vigIn / 2, W / 2, H / 2, Math.hypot(W, H) / 2);
      vignette.addColorStop(0, '#fff'); vignette.addColorStop(1, `rgb(${G.vig[0]}, ${G.vig[1]}, ${G.vig[2]})`);
    }
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = G.grain;
    const ox = (frame * 73) % 256, oy = (frame * 151) % 256;
    ctx.translate(-ox, -oy); ctx.fillStyle = grainPat; ctx.fillRect(ox, oy, W, H); ctx.translate(ox, oy);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  /* stage 7, caught: from the crash on, police light washes across the scene left to right — a red band, then a blue
     one, a new band every SWEEP steps, each crossing in 2 × SWEEP (≈ .7 s), so two are always in flight. It comes from
     where the chaser closes in: brightest leaving the left edge, fading as it travels. Screen blend under the grade
     (the grain stays on top); in-game light, so the signal red is allowed here (the Busted UI stays ice). */
  const SWEEP = 21;
  const CAUGHT = [[255, 42, 61, .3], [40, 110, 255, .5]];   // rgb + peak: the blue needs more against the navy night
  function caught(g, a) {
    if (g.status !== CRASHED && g.status !== BUSTED) return;
    const s = g.statusSteps + a, fade = Math.min(1, s / 10), half = W * .3;
    ctx.globalCompositeOperation = 'screen';
    for (let n = Math.floor(s / SWEEP), j = 0; j < 2; j++, n--) {
      if (n < 0) break;
      const f = (s - n * SWEEP) / (2 * SWEEP);                  // 0 → 1 across the screen
      if (f > 1) continue;
      const x = -half + f * (W + 2 * half), c = CAUGHT[n % 2], al = c[3] * fade * (1 - .5 * f);
      const gr = ctx.createLinearGradient(x - half, 0, x + half, 0);
      [[0, 0], [.25, .3], [.5, 1], [.75, .3], [1, 0]].forEach(([o, k]) => gr.addColorStop(o, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(al * k).toFixed(3)})`));
      ctx.fillStyle = gr; ctx.fillRect(Math.max(0, x - half), 0, Math.min(W, x + half) - Math.max(0, x - half), H);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function render(a = 1) {
    const g = game.g, w = g.world, p = g.player;
    const t = g.frame / C.FPS;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let shake = 0;
    if ((g.status === CRASHED || g.status === BUSTED) && g.statusSteps < C.SHAKE) shake = C.SHAKE_AMP * S * (1 - g.statusSteps / C.SHAKE);
    ctx.save();
    if (shake) ctx.translate(Math.sin(g.statusSteps * 2.7) * shake, Math.cos(g.statusSteps * 3.3) * shake * .5);

    scenery(w, a);

    /* vapour clouds on the road: the cloud image under a screen blend, its flat bottom on the road line */
    if (SPRITES.cloud.ok) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const c of g.particles) {
        const k = 1 - c.life / c.max;
        const cw = c.r * 3 * S, ch = cw / GEO.cloudAspect;
        ctx.globalAlpha = Math.min(1, c.a * k * 1.618);
        ctx.drawImage(SPRITES.cloud.img, X(lerp(c.px, c.x, a)) - cw / 2, groundY + 2 * S - c.y * .3 * S - ch, cw, ch);
      }
      ctx.restore();
    } else for (const c of g.particles) {
      const k = 1 - c.life / c.max;
      const cx = X(lerp(c.px, c.x, a)), cy = Y(c.y), r = c.r * S;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, ink(c.a * k)); gr.addColorStop(1, ink(0));
      ctx.fillStyle = gr; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }

    /* the chaser: a third visible at the left edge, closes in on a crash */
    const parked = -C.POLICE.w * .66, closed = g.playerX - C.POLICE.w - 8;
    police(X(lerp(parked, closed, ease(g.chaser))), true, t);

    for (const o of g.obstacles) {
      const x = X(lerp(o.px ?? o.x, o.x, a));
      if (o.kind === 'police') for (let i = 0; i < o.n; i++) police(x + X(i * (C.POLICE.w + C.POLICE.gap)), false, t + i * .13);
      else if (o.kind === 'tanker') for (let i = 0; i < o.n; i++) tanker(x + X(i * (C.TANKER.w + C.TANKER.gap)));
      else if (o.kind === 'courier') courier(o, x, t);
      else drone(o, x, t);
    }

    const y = lerp(g.prev.y, p.y, a);
    const px = X(g.playerX), py = Y(y + C.CAR.h);
    roadster(px, py, p);

    ctx.restore();
    caught(g, a);
    grade(g.frame);

    if ((g.status === CRASHED || g.status === BUSTED) && g.statusSteps < C.FLASH) {
      ctx.fillStyle = 'rgba(255, 42, 61, .146)'; ctx.fillRect(0, 0, W, H);
    }

    if (debug) {
      ctx.strokeStyle = ink(.618); ctx.lineWidth = 1;
      const box = (b) => ctx.strokeRect(X(b.l), Y(b.t), X(b.r - b.l), (b.t - b.b) * S);
      playerBoxes(p, g.playerX).forEach(box);
      g.obstacles.forEach((o) => obstacleBoxes(o).forEach(box));
      ctx.fillStyle = ink(.618); ctx.font = '13px "Inter Tight", sans-serif';
      ctx.fillText(`${g.status} · speed ${w.speed.toFixed(2)} · y ${p.y.toFixed(1)} vy ${p.vy.toFixed(1)} thrust ${p.thrust} pumps ${p.pumps} · obstacles ${g.obstacles.length} · particles ${g.particles.length}`, 34, H - 21);
    }
  }

  /* where the Roadster's body sits on screen, 0–1 with y down: the launch dives into it (lib/wipe.js) */
  const carPoint = () => ({ x: X(game.g.playerX + C.CAR.w / 2) / W, y: (groundY - (game.g.player.y + C.CAR.h / 2) * S) / H });

  return { render, resize, carPoint, grade: GRADE, regrade() { vignette = null; }, get scale() { return S; } };
}
