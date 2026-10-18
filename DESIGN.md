# Roadster: Outrun — design

Status: concept approved 2026-10-17 · design system v2 approved · stages 1–3 approved (game core, hero v4.2, Higgsfield assets) · **stage 4 polish built, awaiting review**.

## Decisions

| topic | decision |
|---|---|
| controls | Space / ↑ / click = jump; hold = thrusters (higher, longer in the air). No duck. |
| obstacles | Oncoming police cars in groups of 1–3. From ~500 m: drones at two heights. A **low** drone must be jumped. A **high** drone is passed underneath, and jumping into it ends the run. |
| flow | hero (drag the slider to scrub the orbit clip) → Start → blur transition → game → Busted → Restart or Menu |
| platform | desktop only |
| copy | English |
| sound | none |
| length | endless; speed ramps up |
| score | current distance only, no high score |
| branding | text wordmark, no Tesla logo; generic "POLICE" livery; footer "Fan concept. Not affiliated with Tesla, Inc." |

## Screens

1. **Hero v4** (stage 2, 2026-10-17, after the v3 review). Everything sits at 16 from the edges.
   - **Header** (after the user's ref):
     - a **logo tile** 55 × 55, radius 13, white, with a dark "T" (Oxanium 500 34);
     - on the right, **two buttons** "How to play" and "Menu": 34 tall, radius 8, gap 5, light glass .854, Inter Tight
       13/500, centred on the tile; no action yet.
   - **Tick ring:** Ø 377, 89 ticks × 21, centred in the right golden column on the 38.2 % line (`lib/ring.js`).
     - **v4.3 (stage 4): turning, not pointing.** The active zone is a Ø 466 circle (r 233 ≈ 1.24 × R); the
       `.ring` element stays Ø 610, and beyond 233 a move counts as outside.
       - A fresh contact only records the pointer's angle, so nothing jumps.
       - From then on, the angle the pointer travels round the centre drives the clip (k .08 inertia). One clockwise
         turn = the whole clip; counter-clockwise rewinds; it is clamped 0–1.
       - Leaving the zone eases the clip back to frame 0, so every approach starts from the start. The rest frame is
         always the poster.
       - Over the START disc (r < 80) the contact drops but the place holds.
       - While released (START → the game) the ring ignores the pointer; `engage()` re-arms it on return.
       - _(Before: the pointer's absolute angle set the frame, so entering anywhere jumped the clip; the zone was
         Ø 610.)_
     - **Glow:** lit ticks along the ramp `#2a556c → #cfe2ef` with a 21 shadow, plus a **bloom canvas** (thick lit
       ticks + the light spot, CSS blur 21, `mix-blend-mode: plus-lighter`).
     - **Sticky light** (researched: Codrops lerp-follow/snap + a cursor-driven radial-gradient spotlight). The spot
       sticks to the ring path at the cursor's angle, pulled .236 toward the cursor, with inertia k .12; ticks under it
       brighten (gaussian σ 34). On leave it glides back to the head and dims.
     - **3D tilt** toward the pointer, up to 8° (lerp .12), settling flat on leave.
     - START is the glass disc Ø 144 (click, Space, Enter).
   - **Title lockup** (bottom-left, as MUSTANG / FASTBACK in the ref video):
     - a small line in Oxanium 400 at 55 over a big line in Oxanium 300 at 144, its letters on the 16 edge;
     - **A** "TESLA / ROADSTER" with a ghost "2028" (.09) to its right; **B** "DEFY / GRAVITY" (since v4.2; was "THE ROAD / ENDS HERE").
     - **They fly as whole planes through 3D space** (`lib/titles.js`; JS writes eased `--e`, CSS derives
       translate3d + rotateX/Y under `perspective: 987`):
       - A exits over p .236 → .5 (ease-in) up-left and away, blurring to 21 and fading;
       - B enters over p .5 → .764 (ease-out) from huge and tilted at the upper left, close to the camera, and settles
         flat;
       - the filter is `none` at rest, and it is fully reversible.
   - **Removed in v4:**
     - the arrow and its hint, the bracket labels (`[ THE NEW ]`, `[ 0–60 … ]`, `[ THE ROAD ENDS HERE ]`);
     - the date/coordinates block, the round MENU;
     - the giant 233 drum and its ghost row;
     - the visible disclaimer, which now lives in `<meta name="description">`.
   - **The clip** (stage 3b, 2026-10-17) is `assets/hero/hero-orbit.mp4` with `hero-orbit-poster.webp` = frame 0.
     - **Content:** a night pursuit in frame B's desert. The Roadster flies on four jets with two interceptors and a
       drone behind it. One continuous camera move after the Mustang reference: it rushes at the lens, passes overhead,
       runs the side, the rear, then pulls back over the police.
     - **Source:** `seedance_2_5` omni_reference, 6 s, 1080p, no audio, from the single approved keyframe.
     - **Post** (`tools/film.py`):
       - the 0.3 s white flash at about 1 s softened by highlight compression;
       - halation, grain .015, a light vignette;
       - all-intra H.264, crf 23: 145 / 145 keyframes, 8.6 MB.
     - **Scrub:** the ring maps p to `p × 6.04 s` unchanged.
     - The old stand-in clip and `lib/drum.js` were removed in stage 4.
   - **v4.1 (the user's review of v4):**
     - **Logo:** the Tesla mark (`assets/ui/tesla-logo.svg`, from the user's link; `currentColor`) in **black** on the
       white tile, 34. It is Tesla's trademark, used at the user's request; the fan-concept note stays in the meta.
     - **Lockup:** 13 between the small and the big line.
     - **Glow:** the round "ball" is gone. A sweeping arc of light (±55° around the contact, gaussian σ 21°, width 34)
       on the bloom layer, blurred **34**.
     - **Bug fixed:** the contact strength k is 1 only while the pointer is on the ring. It is 0 over the START disc,
       outside the zone, and after `ring.release()` (called on START), so nothing stays lit or bent.
     - **Liquid:**
       - the ring membrane **bulges toward the cursor** (A = (r − R) × .382, σ 21°, ±55) on a spring (stiffness .12,
         damping .72), overshooting ~15 % and wobbling back;
       - a tapered **liquid bridge** runs from the bulge to a glowing **drop that replaces the cursor** in the zone
         (`cursor: none`);
       - it **snaps** past 89 from the ring and re-attaches under 55;
       - the drawing box is 678, and the tilt is ≤ 5° so the drop stays under the real cursor.
   - **v4.2 (the user's review of v4.1):**
     - **Removed:** the drawn drop and liquid bridge, which read as a triangle and a stray circle at the cursor. The
       membrane bulge, the arc light, the tilt and the k-gating stay; past 89 from the ring the membrane lets go and
       re-grabs under 55.
     - **Site cursor** (`lib/cursor.js`, hero and game):
       - a **34 white circle** with a difference blend, following the pointer with a light lerp (k .382);
       - ×1.618 over buttons and links, .8 pressed, 1.3 both;
       - hidden outside the window; the system cursor is off everywhere (fine pointers only);
       - the ring's bulge reaches for it.
     - **Copy:** lockup B is now **DEFY / GRAVITY**; A stays TESLA / ROADSTER + ghost 2028.
2. **Launch (stage 4.1): the liquid-glass wipe** (`lib/wipe.js`). The user: "the same liquid, like glass, through
   blur". START no longer plays the clip out — that version froze: after release the ring's inertia loop kept
   scrubbing the clip back to its frame while it tried to play (the preview pane hid it, since it throttles rAF).
   1. `ring.release()` cancels its frame loop and `hero` stops forwarding the ring to the clip (`active` gate).
   2. `body.is-launch` blurs the hero UI away (header, ring, lockups, scrim: opacity 0, blur 13, .89 s) and hides the
      game's header and telemetry.
   3. The wipe canvas sits over the clip, under the hero UI. It uploads the clip's current frame (cover-fit) and the
      game's first frame as two textures and runs a WebGL2 shader for 987 ms, smoothstep-timed:
      - **refraction:** a flowing 3-octave value-noise field displaces both layers, up to 8.9 % of the screen,
        strongest mid-way (sin πp);
      - **blur:** the same curve as a mip bias (free);
      - **the front:** the game comes through a rippled dissolve shaped by the same noise, with a thin ice rim
        (`.81, .9, .98` at .09) like the ring's arc light;
      - frame 0 equals the clip, the last frame equals the game canvas, so nothing pops.
   4. At the end the screens cut (`is-cut`: no crossfade), `is-launch` goes and the game's header and telemetry blur in over .89 s; the
      loop starts after `input.drain()`.

   A timeout at 987 + 400 ms finishes a throttled tab; no WebGL2 or reduced motion → the old .89 s blur crossfade.
   Busted → Menu runs it back: the clip at frame 0, the ring at 0, the game reset to READY. `__game.wipe.preview()`
   holds one frame for review.
3. **Game** (stage 1, built):
   - A full-screen canvas; the road at 67.1 % of the height (76.4 % lifted 89 of 956 in v5.1) and the Roadster's left
     edge at 14.6 % of the width.
   - A chaser police car shows a third of itself at the left edge.
   - The first press starts the run with a jump, as in Dino.
   - The HUD is the v5 telemetry (below): the hero header, two tick gauges and a mission timeline at the bottom centre.
   - Phases are colour grades of the same scene: **blue hour** → **star night** at 500 m → **pursuit** at 1000 m
     (a slow red / blue wash).
4. **Busted:** the world freezes, an 8-unit shake runs for 400 ms, a red flash lasts 144 ms, and the chaser closes in.
   Busted v2 (below) enters at +610 ms. Restart (the disc, Space or Enter) works after 750 ms; Menu returns to the hero.
   Esc or the Pause button pauses, and so does a hidden tab.

## Engine (stage 1)

- `lib/game/*`, buildless ES modules:
  - the pure simulation, with no DOM, also runs in Node: `config`, `rng`, `player`, `obstacles`, `collide`, `world`,
    `game`, `sim`;
  - the DOM side: `loop`, `input`, `render`, `hud`, `tune`.
- Physics runs on a fixed 60 Hz step. Drawing uses rAF with interpolation, so it stays smooth on 120 Hz, with at most
  5 steps per frame.
- Scale `S = min(W / 600, H / 390)`, so at 1470 × 956 the frame is exactly Dino's 600-unit field.
- Collisions use box lists per sprite, outer box first, as Dino's CollisionBox. Placeholders are canvas silhouettes in
  the v2 palette, one draw function per sprite box, so the stage-3 images drop into the same calls.
- **Dev tools:**
  - `window.__game` exposes `state()` (numbers only), `step(n)` (synchronous), `press()`, `release()`, `seed(n)`,
    `set(k, v)`, `sim()`, `stop()` and `start()`;
  - query flags: `?debug` (hit boxes), `?tune` (sliders + harness), `?seed=N`, `?god` (no collisions).

### Tuning: final values (`lib/game/config.js`), proven by the fairness harness (`lib/game/sim.js`)

Started from the Chrome Dino runner and retuned for a long car (120 × 32 units vs the dino's 44 × 47). Stage 3
(2026-10-17) set the boxes to the real sprites: car 120 × 28.2, police 104 × 30.2, drone 45 × 10.5 (with props), hit
boxes just inside each silhouette. The harness was re-run on those and still passes (below).

| key | value | note |
|---|---|---|
| SPEED → MAX_SPEED, ACCEL | 6 → 13, .001 / step | Dino; max after ≈ 117 s |
| CLEAR_TIME | 34 steps (≈ .57 s) | stage 4 (was Dino's 180). The first car is on screen ≈ step 38 and at the Roadster ≈ 94; the opening jump lands ≈ 43, which leaves about 51 steps to react |
| GRAVITY | .6 | Dino |
| JUMP_V0 | 11.5 + speed × .1 | Dino adds speed / 10 |
| MIN_JUMP, DROP_V | 85, 7 | release cuts the climb to 7 once past 85, so a tap still clears one police car |
| THRUST_MAX, THRUST_G | 34 steps, gravity × .2 | hold = thrusters: higher and longer |
| MAX_JUMP, CAP_V | 160, 1.5 | a soft ceiling: the car hovers there with no overshoot |
| POLICE | 104 × 30.2, rows of 1 / 2 / 3, 6 apart, closing at speed × 1.15 | rows of 2 from speed 7.5, rows of 3 from 10 |
| DRONE | 45 × 10.5 (box: the body, not the props), from speed 8.5 (≈ 500 m), ± .8, a 33 % share | low (bottom 6): jump it · high (bottom 48): drive under |
| GAP | (full airtime + 21 steps) × fastest closing speed, max × 1.5 | measured in time; Dino's width × speed breaks for wide obstacles |
| MAX_DUP | 2 | Dino |
| DIST / MPH | .025 m per unit · speed × 20 mph | 500 m ≈ 47 s; 120 → 260 mph |

Arcs: a tap peaks at 136 (42 steps in the air), a hold at 172 (51 steps).

**Harness: PASS, all five criteria.** Windows are in steps (1 step = 16.7 ms):

| obstacle | tap | hold |
|---|---|---|
| one police car @6 / @13 | 11 / 25 | 19 / 29 |
| two cars @7.5 / @13 | 4 / 18 | 13 / 27 |
| three cars @10 / @13 | 4 / 10 | 13 / 19 |
| low drone @8.5 / @13 | 25 / 30 | 35 / 32 |
| high drone | no jump: clear | a jump under it crashes |

These are the stage-3 numbers, on the sprite boxes. The placeholder boxes gave 9 / 24, 2 / 17, 2 / 9 and 26 / 28 for
the tap, and a worst pair of 10. The worst pair at the minimum gap (two cars → three cars @10) now has a window of 12. A tap is not a reliable way over
two or three cars (window < 6): the hold is the move.

## Car identity (from `refs/car/`, the user's refs, source-only and not shipped in the CDN build)

These are the observable traits every generation must keep:

- Low, long two-door wedge coupe. The nose is a knife-edge: a flat hood falls to a sharp horizontal lip. The body is
  faceted from flat planes (Cybertruck lineage), but the front arches are softly rounded.
- Satin pearl off-white paint, not glossy (highlight `#e3e1e0`). Sills, splitter and lower body are black.
- One-piece bronze-tinted glass canopy (`#3f3431` → `#563c3c`) running from the windshield over the roof.
- Front: a thin full-width white LED bar across the nose, with small chevron headlights at the fender corners.
- Wheels: six black blade spokes over light-grey aero discs, low-profile tyres.
- A small amber side marker sits behind the front arch, and one door crease runs at a slant.
- Flight kit (refs 03, 04): a cylindrical metal **thruster nozzle pointing down just behind each wheel**, four in total,
  with two visible in a strict side view. They fire **white cold-gas vapour jets** (no fire) that hit the ground and roll
  out into a wide vapour cloud. This kit adds a large rear wing with a red LED edge, a full-width red tail bar
  (`#fe063a`), a black diffuser with four round nozzles and the "RDSTR" plate.
- Two versions appear in the refs: **clean** (01, 02, 05, no wing) and **flight kit** (03, 04, wing + nozzles).
  **The game uses the flight kit** (decided 2026-10-17).

## Look (the car refs only; the site style comes with the style refs)

Low-key studio darkness: background `#09090b`, one soft key from the upper left that leaves a grey pool on the floor
(`#acb1b7`), a cool rim tracing the roof line, the rest falling into black. Outdoors (ref 03) it is a night desert with
a Milky Way sky (`#030308`), a faint warm horizon glow (`#bda095`) and red dust lit by the tail bar. The accents are few:
tail red, interior amber `#d48756`, LED white, and the bronze of the glass.

## Assets (stage 3, Higgsfield, one generation at a time)

The shot list, prompt drafts and post-processing live in `prompts/ASSETS.md`. The car sprite is generated first as the
anchor and shown before anything else. Everything goes into `prompts/LEDGER.md`.

### Game art direction: style frame B, picked 2026-10-17

Higgsfield job `3ab13f5a-cad3-4a7e-8606-7acce7cb68b4`, made with `gpt_image_2_5`. It is a calm, near-photoreal night
scene, side-on:
- a near-black navy sky with fine stars and a faint diagonal Milky Way;
- soft cool moonlight from the upper right;
- low dark ridges and soft dunes, a dark road with a thin pale edge line, and dark scrub in the foreground;
- the pearl Roadster as the only bright object;
- black interceptors with red / blue light bars, no lettering;
- red from the police lights and the tail bar only;
- a lot of empty sky.

Every sprite and plate passes this frame as its **first reference**.

**Sprites in the game (3a·1–2, wired 2026-10-17).** The files are in `assets/sprites/*.webp` at 10 px per unit,
loaded by `lib/game/sprites.js`. Each draw function keeps its placeholder until its image loads.
- **The Roadster:**
  - two spinning discs on the hubs at 24.3 / 95.8 units, disc radius 6.76; the hubs were found by 60° spoke symmetry;
  - four thrusters, two at each end: the rear pair is on the sprite (6.3 and 14 units, as in ref 04); the front pair
    mirrors it about the wheelbase (106.1 / 113.8), stamped in canvas from the rear nozzle's ring;
  - the jets are a screen-blended vapour image, stretched with the hold, sheared back with the speed, faded at the
    tip, and clipped at the road.
- **Police:** a mirrored copy for the chaser. The light bar (red 52–55.5, blue 57.3–61.6) blinks in canvas, with its
  glow.
- **Drone:** a canvas blur disc over each stopped prop, and the LED pods blink.
- **Take-off and landing:** the cloud image under a screen blend, its flat bottom on the road.
- **Contact shadows** under every car; the Roadster's fades with height.

**Plates (3a·3, wired 2026-10-17).** These are `assets/bg/*.webp`, drawn by `scenery()` in `lib/game/render.js`.
Layout (`BG` in `lib/game/sprites.js`):
- the road's far edge sits 8 units above the wheel line, so the cars drive on the asphalt and not on its edge;
- the far ridges (64 units tall, .1×) and the mid dunes (26 units, .4×) stand on that edge, tucked 2 units under it;
- the road plate fills from that edge to the bottom (1×);
- the sky is static, cover-fit, with its hazy bottom on the horizon.

Phases stay canvas grades:
- **blue hour:** the phase gradient, with the sky plate at .382 over it;
- **night:** the full sky plate;
- **pursuit:** night plus the red / blue wash;
- **all phases:** a thin screen haze over the ridges (.12 at blue hour, .03 at night).

The v2 placeholders still draw if any plate fails to load.

**The film grade (stage 4).** The game is graded to match the hero clip. The user likes the clip, so the game moves
toward it.
- **Phase 0 sky:** indigo-navy `#080a12 → #1e2848` (was teal); the horizon haze is indigo `86, 98, 160`.
- **`grade()`**, drawn last in `render()`:
  - a soft-light warm mauve `rgb(135, 95, 95)` at .4, which takes green and blue down more than red, so the navy turns
    indigo-violet like the clip;
  - a multiply radial vignette to `rgb(150, 150, 168)` from 38 % of the diagonal;
  - live grain: a 256² noise tile drawn as an overlay at .07, at a new offset every frame.
- **Fitted by numbers** against the clip's night end frame (shadows [8, 11, 19], mids [17, 20, 31]):

  | game, measured | shadows | mids |
  |---|---|---|
  | blue hour | [9, 11, 19] (was [12, 20, 27]) | [18, 21, 35] (was [22, 38, 51], teal) |
  | night | [4, 8, 14] | [14, 18, 29] |

  Pursuit keeps its red / blue police wash.
- **Cost:** CPU 0.05 ms per frame. The values sit in `GRADE` and are exposed as `__game.grade` for tuning.

**HUD (stage 4, replaced by v5 below).** The Distance / Speed panels were light frosted glass.

Two departures from the frame:
- the moon in its top-right corner is left out, because the HUD sits there;
- A's volumetric haze around the light bars may come back as a canvas effect in the pursuit phase.

## Style — v4 changes (2026-10-17)

- **Sizes:** the hero's big line is 144 (= 233 / φ) under a 55 small line. The scale is 13 · 21 · 34 · 55 · 89 · 144;
  233 is retired.
- **Retired:**
  - the bracket label and the thick arrow (the user called them junk);
  - the hero letter-drum, the ghost row and the visible disclaimer.
- **New:**
  - the header logo tile (55, radius 13, white, "T") and the light header buttons (34, radius 8, glass .854, Inter
    Tight 13/500);
  - the 3D flying lockup;
  - the ring's bloom (plus-lighter), sticky light and tilt.

## Style — v3 additions (2026-10-17, the hero rebuild)

- **The instrument voice: Oxanium** (Google Fonts, OFL; 300/400/500). It is the closest free match to the user's ref
  "24": monoline, rounded square forms, an open 4 with a chamfer. It sets the giant title (300 / 233 / lh .74 / −1 %),
  the logo (500 / 34 / +2 %) and every `[ label ]` (400 / 13 caps / +4 %, brackets at .382). Inter Tight stays for
  sentences and the game UI; Doto stays for the in-game numbers.
- **Sizes:** 13 · 21 · 34 · 55 · 89 · **233**, Fibonacci, ×φ apart (233 is new).
- **Ghost ladder:** .382 ghost text · .146 glass · **.09 ghost headings** (new, = .146 × .618).
- **Components:**
  - bracket label;
  - ghost circle button 55;
  - glass disc button 144;
  - thick arrow 89 × 55 / stroke 8;
  - **tick ring** Ø 377 / 89 × 21 / glow 13 / inertia k .08;
  - letter-roll drum (the giant title and its ghost row).
- **The accent is our blue ramp as a glow, on the ring only.** The red signal stays in-game.
- **anti-slop overrides:**
  - a coloured glow on the ring (the user asked for it);
  - 6 type sizes on the site (the hero uses 4);
  - three families (Oxanium, Inter Tight, Doto).
- The specimen `design-system.html` shows all of it, with a live ring in the "Hero kit" section.

## Style — v2 (minimal, golden ratio), approved 2026-10-17

Tokens live in `tokens.css`, and the specimen is `design-system.html` (`npx serve . -l 5198` → `/design-system.html`,
press **G** for the golden-section guides). Refs: `refs/style/01-octo-hud-poster.png`, `refs/style/02-lumina-landing.webp`.

**Base:** the house **luxury-mono** preset: one family, two weights, no mono, no caps labels, no numbering, no strokes,
no shadows. On top of it goes the OCTO colour ramp (Lumina's title gradient was used once, then dropped on 2026-10-17). Checked against anti-slop,
minimalist-ui and high-end-visual-design. The goal is Tesla / SpaceX restraint: each visual element should only
lightly underline the content.

**Fibonacci everywhere.** Every length is a Fibonacci number of design pixels, `--u = 100vw / 1470`:
`5 · 8 · 13 · 21 · 34 · 55 · 89 · 144 · 233 · 377 · 610`. Opacities are powers of φ: `1 · .618 · .382 · .236 · .146`.
Panels and stages are golden rectangles (1.618 : 1, the Busted stage 2.618 : 1). Section heads split 61.8 / 38.2. The
cover title is centred on the golden point, 38.2 % of the viewport height (measured: line box 365 px, ink centre
364 px at 1470×956).

| ref | taken | ignored |
|---|---|---|
| OCTO | The colour ramp sampled down the centre: `#080808` to 40 % → `#0a0f13` 44 → `#152832` 52 → `#2a556c` 61 → `#4f86a5` 70 → `#7eb0cb` 78 → `#abcee2` 87 → `#cfe2ef` 100. From the HUD only **one reticle circle and four corner ticks**, at .146. | the rest of the HUD kit, the grid, the chamfered wordmark |
| Lumina | ~~The headline gradient~~ (dropped 2026-10-17: the title is solid white). | italic-serif accent words, mono caps UI, chips, the dot-matrix texture |

- **Type: two families, five sizes, each step ×φ, Fibonacci line heights.**

  | role | size / line | tracking | weight, tone |
  |---|---|---|---|
  | title | 89 / 89 | −4 % | 400, solid (the gradient was dropped) |
  | display | 55 / 55 | −3.5 % | 400 |
  | heading | 34 / 42 | −2.5 % | 400 |
  | body | 21 / 34 | −1 % | 400, .618 |
  | small | 13 / 21 | 0 | 500 for actions, 400 at .382 for captions |

  - Inter Tight 400/500 sets every word.
  - **Doto** sets numbers only, in round dots (`ROND 100`) at weight 700, on the same steps: 34 HUD, 55 counter,
    89 Busted distance.
  - **Wordmark:** "OUTRUN" in Inter Tight 500, 13 px, caps, +38.2 % tracking. It is the only caps text in the system.
  - **No italic anywhere** (user, 2026-10-17), no mono, no third family.
- **Colour:**
  - the ramp above, with type in solid `#eef4f8` at the φ ladder (the title gradient was dropped on 2026-10-17);
  - **signal red `#ff2a3d` lives only inside the game** (tail lights, police, crash flash) and never in UI chrome.
- **Surfaces:** glass is `rgba(8,8,8,.382)` + `blur(21) saturate(1.382)`, a **fill only, with no edge, highlight or
  shadow**. Nothing on the page has a border, an outline or a box-shadow (verified by script).
- **Components:**
  - buttons 233 × 55 (233 : 55 ≈ φ³), radius 5, label 13/500 in sentence case: primary ice-white (white on hover),
    secondary glass, text link .618 → 1;
  - panels radius 13;
  - the control hint is plain text, "Press **Space** to jump";
  - the HUD shows numbers only.
- **Motion: two patterns.**
  - Hero entrance: blur 13 → 0, y 21 → 0, .89 s expo-out `(.16,1,.3,1)`, 89 ms stagger. The class is removed after the
    entrance, so blur only exists while something is moving.
  - Button press: scale .98 over 144 ms.
  - No scroll reveals, and reduced-motion is respected.
- **Removed in v2 (do not bring back):** mono and pixel alternates, caps micro labels, numbered eyebrows, chips and ■
  bullets, the pulsing dot, outlines on panels, corner brackets, boxed keycaps, the HUD kit, the grid and dot textures,
  the scramble decode, the second CTA on the cover, and the SVG wordmark.
- **anti-slop overrides** (the scanner reports 2, both deliberate):
  - Inter Tight is the house face (design-dna Principle 6, luxury-mono).
  - Gradient text appears on the hero title only, at the user's request (Lumina ref).
  - The centred hero is product-specific HUD symmetry with one CTA and no chip.
  - Dark mode is the product context.
- On INGEST, the house Instrument Serif × Inter Tight pairing is **not** used here (no italic), so its watch count
  stays at 2.

## Game UI v5 — "SpaceX telemetry" and Busted v2 (2026-10-17)

The user: the game UI "doesn't match the hero, it's boring", and the game-over window is "not it either". The old HUD
was the hero-metric template (two frosted cards with a number and a label) plus a glass "Busted." card. None of the
hero's language carried over. v5 rebuilds it from the hero's own parts. The user picked the direction (SpaceX launch
telemetry) from three.

**Shared tick language (`lib/ticks.js`).** The ramp `#2a556c → #cfe2ef`, the colour helpers and the gaussian moved out
of `ring.js`, so the instruments light exactly like the ring:
- lit ticks along the ramp;
- unlit ticks .236 → .09;
- a long head tick;
- glow from a second canvas, CSS blur + `plus-lighter` (no `shadowBlur`).

**The cluster (`lib/game/telemetry.js` draws, `hud.js` writes).** It is 966 × 144 at the bottom centre, on the road
band below the ground line (cluster top y 796 against the ground at y 641 at 1470 × 956, after v5.1), so it never
covers play.
One soft radial darkening sits under it, with no card and no glass.

| part | geometry | shows |
|---|---|---|
| SPEED gauge | Ø 144, 270° arc of 55 ticks, open at the bottom | 0–260 mph (`GAUGE_MPH`); the shown value lerps (k .12), so it spins up on launch and falls to 0 on a crash |
| ALTITUDE gauge | the same, at the right | `player.y × ALT_FT` (.556, stylised: the 160 cap reads 89 ft) |
| thrust budget | 13 short ticks in the altitude gauge's open bottom | `THRUST_MAX − thrust`: drains while the jets fire, refills on landing |
| mission timeline | 610 wide, 55 ticks; nodes (21 tall) at the thirds and the end; head 34 | equal thirds: blue hour 0–500 m, night 500–1000 m, chase 1000 m → the best run (`max(best, 1500)`) |

The timeline:
- The distance (Doto 21) rides the head like the ring's `000°`.
- The node captions are coming ink-3, passed ink-2, current ink-1.
- The clock under it reads `T− 00:00` plus the call to action ("Press Space to launch · hold to fly", body size) in
  READY, then `T+ mm:ss`.
- The colon is Oxanium, because Doto's own reads as a dagger.
- Doto numbers carry no digit grouping (its space is a full cell).

**Best run.** It is kept in `localStorage['outrun:best']` (try/catch, so the page works without it). The timeline's end
uses the best as the run began.

**Redraws.** The canvas redraws only when a lit count, the head or a flash changes: 2 redraws in 3 s of straight
running and about one per frame in the air. A step plus a draw costs about 0.09 ms of CPU.

**Phase callout.**
- On reaching night and chase:
  - the node flashes (a bloom pulse, `(1 − world.fade)²`);
  - a lockup flies at the upper right, in the free sky above the drone row: `PHASE 02` (Oxanium 21, label tracking)
    over `NIGHT` (Oxanium 300, 89).
- It enters as mirrored hero B: from huge and near the camera over 37 steps.
- It holds, then leaves as mirrored hero A: swinging away over the last 37 of `CALLOUT` 155 steps (about 2.6 s).
- It is driven by `world.phaseSteps`, not timers, so pause freezes it. A crash clears it for Busted.

**Header and pause.**
- `.game__head` shares `.hero__head`'s rules and spot, so across the launch cut it reads as one header:
  - the Tesla tile;
  - `Pause` / `Resume` and `Menu`.
- Pause is disabled in READY and Busted. Buttons drop focus after a click, so Space goes back to the jump.
- Paused: the canvas at .382 and a centred `PAUSED` (Oxanium 300, 55) over "Esc or Space to resume".

**Busted v2: the hero's layout.**
- The hero scrim fades in and the cluster blurs out (.377 s).
- **The lockup, bottom left.** The phase you were caught in (`PHASE 02 · NIGHT`, 55) over `BUSTED` (Oxanium 300, 144).
  It flies in like hero B over 610 ms.
- **The ring, at the hero ring's spot (80.9vw, 38.2 %).** The hero ring as a display: Ø 377, 89 ticks, no membrane.
  - It fills to distance / best over 987 ms (expo-out), full on a new best.
  - The distance rides its head.
  - In the centre is the `RESTART` disc, the START disc, enabled at `RESTART_LOCK` (750 ms). Space and Enter still
    restart, and nothing waits on the animation.
- **Under the ring, the summary.** Distance, top speed, max altitude and flight time as caption + Doto pairs with no
  boxes, then `Best 2 310 m` or `New best`. It staggers in (y 21, blur 8, 610 ms, 89 ms apart).
- On Restart everything leaves in 233 ms.
- `--signal` red stays out of the UI: the police lights in the canvas carry it.
- The whole entrance runs off the game's `statusSteps`, so `__game.step()` tests it exactly.

**Stats.** `game.js` keeps `g.stats = { topMph, maxY }` per step (`snapshot().stats`), so `step(n)` never misses a peak.

**Motion budget (3 patterns):**
1. the 3D lockup flight (callout, Busted);
2. the blur-fade group entrance;
3. tick fill / light.

**Dev.** `__game.hud()` reports the shown mph, best, callout opacity, redraw counts, the ring's lit ticks and the disc
state. `__game.warp(m)` jumps the run to m metres.

**v5.1: the field lifted, a soft dark floor (2026-10-17).** The user: lift the whole game about 80 px so the panel has
more room, and darken the scrub below with a gradient and a slight blur. The pre-change version is kept in
`~/new-17-backup-ui5`.
- **The lift.** `C.GROUND` .764 → .671: 89 of 956, the nearest Fibonacci step to 80. The road's far edge is at y 621
  and the wheel line at y 641. Everything in the field moves with it (sky, ridges, cars, jets, puffs). Units and hit
  boxes don't change, and the harness still passes.
- **The ground plate keeps frame B's scale.** `BG.groundH` 100 units, what it filled before. It used to stretch to the
  screen's bottom, which would have widened the road. Below it the plate's lower half (the scrub) runs on, mirrored
  then straight, so every join meets the same row and no seam shows.
- **The soft floor** (`render.js` `ground()`):
  - The ground plate is blurred once (6 plate px, about 3.7 px on screen), wrapped sideways so the loop stays seamless.
  - It is faded in down the plate: sharp at the pale edge line (`BG.line` .27), fully soft from .62.
  - A dark gradient (rgba 8, 8, 8: 0 → .382 → .786) runs from the line to the bottom.
  - Both are drawn under the cars and the grade, so the film grain stays sharp on top.
  - The cost is two extra plate draws and a fill: a step plus a draw is about 0.17 ms of CPU, at 58.7 fps in a headless
    tab.

## Stage 6 — the fuel truck mini-boss and the double-tap afterburner (2026-10-17)

The user asked for mini-bosses: "vans with fuel, with barrels of gasoline", jumped with a double press of Space (the
car must go higher or hang in the air), coming right after the first police car. The sprite went through three rounds
(`prompts/ASSETS.md` §6a):
1. a lettered van, driving our way: rejected — must be in the game's colours, oncoming, no lettering, fewer details;
2. a stretched pickup: rejected — "doesn't look like a fuel truck at all";
3. two real trucks, of which the user picked **B**, a cab-over lorry with dark-red barrels stacked two high.

Backups of the versions before this stage: `~/new-17-backup-ui5`, `~/new-17-backup-ui51`.

**The afterburner** (`player.js` `boost()`; `game.js`: a press while airborne).
- A second press in the air, once per jump, at any moment.
- The car eases up to `CRUISE` 120, or holds its height if higher, and glides there for `BURN` 72 steps (1.2 s) with no
  gravity and no hold needed. Then normal flight resumes; if the key is still held, the remaining thrust carries on.
- **Feedback:**
  - all four jets run long and full (k 1.618 → 1.236);
  - the altitude gauge's thrust ticks turn ice and drain over the burn.

**The truck** (`TANKER` in `config.js`, `assets/sprites/tanker.webp`).
- 233 × 78.9 units, oncoming like the police (closing at speed × 1.15).
- Hit boxes: the cab, the barrel block, the chassis.
- One held jump stays above it for about 33 steps, whatever the speed.
- An oncoming obstacle sweeps past faster as the game speeds up, so the convoy grows: one truck below `TANKER.two` 7.0,
  two (gap 13) from it.
- **The spawn rule** (`obstacles.js`):
  - the **second obstacle of every run** is a truck (`TANKER.at` 2; seeds 1–20 all run police → truck → police);
  - later ones roll `share` .09, at least `apart` 8 spawns apart;
  - the gap behind a truck adds the burn: (airtime + BURN + REACT) × fastest closing.
- **The callout:** `FUEL TRUCK` / `DOUBLE TAP` flies in as each truck enters (`g.boss.steps`). If a phase callout is
  already flying, the newer one wins.

**Proof** (`sim.js`, now 7 checks, all passing). Swept every 0.25 from speed 6 to 13:
- a tap or a hold never clears the truck (window 0 everywhere);
- a double tap with the second press 3, 13 or 21 steps after the first clears it with windows of 13–58 steps;
- the tightest pair at the minimum gap is still 12 steps (police2 → police3 and truck → police3 at speed 10).

**Cost.** A step plus a draw is 0.167 ms of CPU, unchanged. The frame rate was identical to the backup's in the same
headless tab: 30.2 fps for both, because headless Chrome capped frames at 30 Hz during that run.

| tuning | value |
|---|---|
| `BURN` | 72 steps (1.2 s) |
| `CRUISE` | 120 units |
| `TANKER` | w 233 · h 78.9 · gap 13 · offset .15 · at 2 · share .09 · apart 8 · two 7.0 |

## Stage 7 — tap to hover, the caught light sweep, the courier (2026-10-17)

The user on stage 6: no double tap. "You have to tap Space fast to keep it in the air; let go and it starts to fall,
like real physics." Then: a courier on a moped after the truck, and on the crash screen a red-blue police light that
flows smoothly and quickly from left to right, "as if they've just caught us". Backup before this stage:
`~/new-17-backup-s6`.

**Tap to hover** (`player.js` `pump()`; it replaces stage 6's `boost()`, `BURN` and `CRUISE`).
- The jump is unchanged: a press jumps, holding gives the Dino-style thrust, releasing cuts the climb.
- **Every further press in the air is a thrust pulse.** A fall is halved first, then `PUMP` 3 is added to the upward
  speed, capped at `PUMP_VMAX` 6.
- The pulses come from `PUMPS` 13 per jump, refilled on landing. Those are the altitude gauge's 13 ticks; they glow while
  a pulse fires.
- Gravity acts between taps, so 6–10 taps a second hold the car up (against the soft ceiling at 160), slower tapping
  sinks it, and stopping drops it: from 165 to the road in 21 steps.
- Each pulse kicks the four jets long for 8 frames (k 1.618 → 1).
- The truck callout now reads `FUEL TRUCK` / `TAP FAST`.
- **The budget of 13** keeps fast tapping from flying forever; without it every obstacle would turn trivial.
- **The gap behind a truck** allows a flight tapped out on the whole budget (13 × 8 steps).

**Proof** (`sim.js` check 7 is now "tapping clears it": a tap every 6, 8 or 10 steps, each held `TAP`, until the budget
runs out or the car lands; 7/7 pass). Swept every 0.5 from speed 6 to 13:
- a tap or a hold never clears a truck;
- tapping every 6–10 steps clears it with windows of 25–59;
- every 13 steps, 16–43;
- every 21 steps (≈ 3 a second), 0–11, so slow tapping mostly fails.

Cost: a step plus a draw is 0.128 ms of CPU.

**The caught light sweep** (`render.js` `caught()`).
- From the crash on, police light washes across the scene left to right: a band of red, then one of blue.
- A new band starts every `SWEEP` 21 steps and crosses in 42 (≈ .7 s), so two are always in flight.
- Each band is a soft bell about 0.6 W wide. It comes from where the chaser closes in: brightest leaving the left edge,
  half as strong at the right.
- Peaks: red `255, 42, 61` at .3; blue `40, 110, 255` at .5 (it needs more against the navy night). Screen blend under
  the grade, fading in over the first 10 steps; Restart cuts it at once.
- Measured mid-band in the sky: red (58, 27, 45), blue (28, 48, 97), against (11, 14, 26) beside it.
- It is in-game light, so the signal red is allowed. The Busted UI stays ice.

**The courier (7b, approved by the user)** (`COURIER` in `config.js`, `assets/sprites/courier.webp`).
- A generic delivery courier with no brand marks: a black e-moped, and a green jacket matching the green box. v2: in
  dark clothes he vanished on the night road (`LEDGER.md` #35).
- 44 × 42.4 units, facing right. He rides our way at `own` 15 % of our speed, so we overtake him (closing = speed × .85),
  with a small ride bob in the drawing; the hit boxes stay still.
- Hit boxes: the rider, the box, the moped. He is jumped like a police car, Dino's cactus.
- **Spawning** (`obstacles.js`):
  - every run opens **police → truck → courier** (40 seeds checked; the first spawn is now always one police car);
  - after that he is a regular type, `share` .2 of the non-drone rolls: about 15 % of obstacles over a 150 s run.
  - His slower closing never lets a follower overlap him on screen (0 overlaps in 20 long runs): the follower gains
    only .3 × speed and the minimum gap is far larger than the 134 units it would need.
- **Proof:** `sim.js` check 8, "a tap clears the courier". The windows are tap / hold 10 / 18 at speed 6 and 24 / 32 at
  13, increasing in between. All pairs at the minimum gap stay ≥ 12, including courier → police3 at 10.

| courier | value |
|---|---|
| `COURIER` | w 44 · h 42.5 · own .15 · at 3 · share .2 |

| tuning | value |
|---|---|
| `PUMP` · `PUMP_VMAX` · `PUMPS` | 3 · 6 · 13 per jump |
| `SWEEP` | 21 steps per band start, 42 per crossing |

## Stage 8 — the dive launch and a harder opening (2026-10-17)

The user, interrupting the builds: the title → game transition is boring ("make it pull you in"), and the game should be
harder from the start, with more characters right away. The builds resume after this stage
(`~/new-17-offline` is half made and will be re-synced).

**The dive** (`lib/wipe.js`, 1 100 ms; replaces the stage 4.1 liquid-glass wipe). One move, toward the viewer.
- **A · the pull, p 0 → .6, cubic ease-in.**
  - The clip zooms toward a centre point (×1 → ×3.4) with an 8-tap radial zoom blur along the ray to the centre.
  - An RGB split along the rays (≤ 0.8 %) and a vignette closing in.
  - The centre glides from the screen middle to the Roadster's body in the game (`renderer.carPoint()`, passed by
    `main.js`).
- **B · the arrival, p .45 → 1.**
  - The game opens through a circular iris from that point (smoothstep radius, a thin ice rim).
  - Inside it the game starts at ×2.2, zoom-blurred, and settles to ×1 on an expo-out.
  - Mid-way the iris reads as a small portal at the end of a tunnel of vapour.
- **Ends match:** p 0 against the clip differs by 0.08 % (dpr 1) and 0 % (dpr 2); p 1 against the game by 0 % and
  0.1 %.
- **Cost:** the buffer is capped at dpr 1.5, as sharp as the 1920 clip. GPU time per frame with a sync readback:
  - 5–17 ms at 1470 × 956 against the old shader's 26–29 ms;
  - 26–37 ms at dpr 2, where the old one would be about 4 × 28.
- **A real START (headless):** the cut at 1.13 s, 0 seeks during the launch, console clean.

**Around it** (`style.css`, `--ease-in` `cubic-bezier(.55, 0, 1, .45)` in `tokens.css`).
- The hero UI flies past the camera over .45 s:
  - the tick ring scales ×2.2 (we fly through it);
  - the lockup rushes off to the lower left at ×1.6;
  - both fade with blur 13;
  - the header goes in .25 s.
- After the cut the game arrives in steps: the header blurs in over .61 s, then the telemetry rises 34 px with blur,
  89 ms later.

**A harder opening** (`config.js`, `obstacles.js`, `sim.js`).

| | was | now |
|---|---|---|
| `SPEED` · `ACCEL` | 6 · .001 (top speed ≈ 117 s) | 6.5 · .0012 (≈ 90 s) |
| `GAP_MAX` · `REACT` | 1.5 · 21 | 1.15 · 18 |
| `ROW2_SPEED` · `ROW3_SPEED` · `DRONE.minSpeed` | 7.5 · 10 · 8.5 | 7 · 9.5 · 7.5 (rows of two at ≈ 7 s, drones at ≈ 14 s, rows of three at ≈ 42 s) |
| `COURIER.share` · `TANKER.share` / `apart` | .2 · .09 / 8 | .3 · .12 / 6 |
| gap behind a truck | 13 × 8 extra steps | 13 × 5; the harness now stops tapping once the truck is behind the car, as a player does |

**Measured** (20 seeds, `GOD`):
- obstacles per minute 35.9 → 39.5; in the first 20 s 10.8 → 11.9;
- the first minute now has drones (≈ 9 a run) and rows of three, which it never had before;
- the time-based fair gap (airtime + REACT) caps how much denser it can get without making landings unfair;
- `runSim()` 8/8, the tightest pair 9 steps;
- 40 seeds still open police → truck → courier.

## Stage 9 — phones (2026-10-17)

The user: "a careful mobile adaptation". The desktop range is untouched: at 1470×956, screenshots before and after differ
only by the film grain's per-frame noise.

**Breakpoints** (`tokens.css`, `style.css`).
- **Portrait** (`max-width: 767px` and portrait): `--u` = `100vw / 430`.
  - Components scoped to their own design pixel: the hero ring `100vw / 520`, the lockups `/ 800`, the callout and the
    Busted lockup `/ 640`, the telemetry `--tu` (1/398 of its box).
- **Short landscape** (`max-height: 520px`): `--u` = `min(100vw / 1470, 100dvh / 956)`; the telemetry `100dvh / 700`,
  the Busted summary `/ 600`.
- **On both:**
  - text floors: small 11 px, body 13 px, heading 14 px;
  - the header's tile and buttons stay thumb-sized (40 / 34 px);
  - safe areas (`viewport-fit=cover`, `env(safe-area-inset-*)`).

**Portrait game.**
- The full 600-unit road spans the width (`S = W / 600`, Dino on a phone), so reaction distance and timing match the
  desktop.
- The ground line sits at `GROUND_PORTRAIT` .58.
- Telemetry layout `GEO_MOB`: the gauges at the sides with the clock between them, the timeline across the width
  below.
- Busted: the ring at 28 %, the summary 2 × 2 under the road, the lockup at the bottom.

**Touch.**
- Prompts swap by `(hover: none) and (pointer: coarse)`: "Tap to launch · hold to fly", "Tap to resume".
- No double-tap zoom; a finger dragged round the ring scrubs and **holds** on lift (`ring.js`: a touch
  `pointerleave` no longer rewinds).

**Checked** in headless Chrome with touch emulation at 375×812, 390×844 and 430×932 (@3) and 844×390 / 932×430:
- no horizontal overflow, no text under 11 px, nothing off-screen;
- a finger quarter-turn on the ring gives 0.25, held after the lift.

## Ship (2026-10-17)

- **`~/new-17-offline`:** zero network dependencies.
  - Google Fonts self-hosted byte-for-byte (`fonts/SHA256SUMS`); `vercel.json` immutable caching.
  - **Live at https://new-17.vercel.app** (Vercel project `new-17`): 200, immutable `assets/` and `fonts/`, 206
    ranges on the clip, absolute `og:image`.
  - Verified live: 42 resources, all same-origin; fonts loaded; the launch in 1.1 s; console clean.
- **`~/new-17-cdn`:** 16 media files on Higgsfield storage, each sha-256 identical to the local file, CloudFront with
  `access-control-allow-origin: *`; fonts from Google.
  - The source now loads sprites with `crossOrigin = 'anonymous'` and the clip with `crossorigin="anonymous"`, so the
    game canvas stays readable and the WebGL dive works from CloudFront.
  - Verified on 5200: 14 CloudFront resources, the canvas readable, the launch in 1.1 s.


**Hero clip on phones (after the ship).** The user: on the Vercel link the hero video does not work on a phone. The clip
is fine for phones (H.264 High@4.0, 1080p, all-intra). The cause is loading: iOS Safari (and data-saving Android) fetch
nothing for a video that has never played, whatever `preload` says, so the ring's seeks land nowhere and the hero stays
on its poster.
- **Fix** (`lib/hero-video.js`): the clip is primed with a muted inline `play()`, then paused straight away and put back
  where the ring is. That needs no gesture.
- Where even that is refused (iOS Low Power Mode), the first touch or click anywhere primes it inside the gesture.
- A scrub that arrives before the metadata now waits for it instead of being dropped.
- **Checked** in Chrome phone emulation, locally and live: the clip buffers fully at load, and a finger quarter-turn
  lands at 1.61 s. Real iOS Safari could not be run here (no Xcode); the user then confirmed it works on their phone.
- With Reduce Motion on, the hero deliberately stays on the poster (no scrub).
