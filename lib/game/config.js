/* The one tuning table. Units are Dino units (the 600-wide field) at 60 steps per second; heights are measured
   up from the road. Start values come from the Chrome Dino runner and were tuned for a long car with the fairness
   harness (lib/game/sim.js). `C` is mutable so ?tune can move values live. */

/* stage 9: a phone held upright — the field spans the width (Dino on a phone) and the road sits higher */
export const PORTRAIT = '(max-width: 767px) and (orientation: portrait)';

export const C = {
  FPS: 60,

  /* — screen: scale S = min(W / FIELD_W, H / FIELD_H); golden placements — */
  FIELD_W: 600,
  FIELD_H: 390,
  GROUND_PORTRAIT: .58,   // portrait phones: the scene mid-screen, the HUD on the floor below
  GROUND: .671,        // ground line: frame B's .764 (1 − .236) lifted 89 of 956 (UI v5.1), so the telemetry has room
  PLAYER_X: .146,      // the Roadster's left edge at .382² of the width

  /* — speed (Dino) — */
  SPEED: 6.5,          // stage 8: a harder opening (was Dino's 6)
  MAX_SPEED: 13,
  ACCEL: .0012,        // per step → max after ≈ 90 s (stage 8; was .001, 117 s)
  CLEAR_TIME: 34,      // steps (≈ .57 s) with no obstacles: the first car arrives ≈ step 92, after the opening jump (≤ 51) + REACT

  /* — jump: Dino's arc, plus a thrust phase while the key is held — */
  GRAVITY: .6,
  JUMP_V0: 11.5,       // + speed × JUMP_SPEED_K, as Dino adds speed / 10
  JUMP_SPEED_K: .1,
  THRUST_MAX: 34,      // steps of thrust per jump
  THRUST_G: .2,        // gravity multiplier while thrusting
  DROP_V: 7,           // release cuts the upward speed to this…
  MIN_JUMP: 85,        // …once the jump has passed this height (a tap clears one police car)
  MAX_JUMP: 160,       // apex cap; thrust ends here
  CAP_V: 1.5,          // upward speed allowed at the cap
  TAP: 5,              // steps a tap is held (≈ 83 ms), used by the harness
  /* stage 7, tap to hover: every press in the air after the jump is a thrust pulse — the upward speed gets PUMP (a fall is
     halved first), capped at PUMP_VMAX — from a budget of PUMPS per jump, refilled on landing (the altitude gauge's 13
     ticks). Gravity acts between taps: 6–10 taps a second hold the car up, slower lets it sink, stopping drops it. One
     held jump stays above the truck ≈ 33 steps; tapping every 6–10 steps, 96+ */
  PUMP: 3,
  PUMP_VMAX: 6,
  PUMPS: 13,

  /* — sprites: w × h in units = the stage-3 images at 10 px per unit (assets/sprites/*.webp); hit boxes
       [x, y-from-top, w, h] sit just inside each silhouette: the wing, the light bar and the props never hit — */
  CAR: { w: 120, h: 28.2, boxes: [[5, 11.5, 106, 14.5], [30, 2.5, 50, 9]] },
  POLICE: { w: 104, h: 30.2, gap: 6, offset: .15, boxes: [[8, 10.5, 93, 17.5], [40, 2.5, 44, 8]] },
  DRONE: { w: 45, h: 10.5, minSpeed: 7.5, offset: .8, low: 6, high: 48, boxes: [[8, 1.5, 29, 7.5]] },
  /* the fuel truck (stage 6 mini-boss, assets/sprites/tanker.webp): oncoming like the police and long enough that one
     held jump never outlasts it, so it takes tapping (the pulses below) — one truck below `two`, two in a row from it
     (sim.js checks 6–7 prove both). The second obstacle of every run; then a roll of `share`, `apart` spawns apart. */
  TANKER: { w: 233, h: 78.9, gap: 13, offset: .15, at: 2, share: .12, apart: 6, two: 7,
            boxes: [[10, 8, 48, 30], [62, 10, 160, 27], [4, 36, 226, 40]] },
  /* the delivery courier (stage 7b, assets/sprites/courier.webp): a background obstacle, Dino's cactus. He rides our
     way at `own` of our speed, so we overtake him (closing = speed × (1 − own)), and is jumped like a police car. The
     third obstacle of every run, then a regular type (`share` of the non-drone rolls). */
  COURIER: { w: 44, h: 42.5, own: .15, at: 3, share: .3, boxes: [[15, 2, 9, 30], [4, 9, 10, 18], [2, 26, 40, 14]] },
  ROW2_SPEED: 7,       // rows of 2 police cars from this speed (stage 8: 7.5 → 7, ≈ 7 s in)
  ROW3_SPEED: 9.5,     // rows of 3 (stage 8: 10 → 9.5)
  DRONE_SHARE: .33,    // chance of a drone once drones are unlocked (Dino: 1 of 3 types)

  /* — spawning — */
  REACT: 18,           // steps of reaction time between landing and the next jump (stage 8: 21 → 18)
  GAP_MAX: 1.15,       // max gap = min gap × this (Dino's 1.5; stage 8: closer to the fair minimum)
  MAX_DUP: 2,          // at most 2 identical obstacles in a row (Dino)

  /* — scoring, phases — */
  DIST_COEFF: .025,    // metres per unit (Dino's score coefficient)
  MPH: 20,             // mph per unit of speed
  PHASES: [0, 500, 1000],   // blue hour · star night · pursuit (metres)
  PHASE_FADE: 120,     // steps

  /* — telemetry (lib/game/telemetry.js, hud.js) — */
  GAUGE_MPH: 260,      // the speed gauge's full scale (MAX_SPEED × MPH)
  ALT_FT: .556,        // ft per unit, stylised: the 160 cap (MAX_JUMP) reads 89 ft
  CALLOUT: 155,        // steps a phase callout flies (≈ 2.6 s): in, hold, away

  /* — crash and game over (steps) — */
  SHAKE: 24,           // 400 ms
  SHAKE_AMP: 8,        // units
  FLASH: 9,            // 144 ms
  BUSTED_DELAY: 37,    // 610 ms
  RESTART_LOCK: 45,    // 750 ms (Dino GAMEOVER_CLEAR_TIME)
  CHASER_IN: 36,       // steps for the chaser to close in

  GOD: false,          // dev only (?god): collisions are ignored, for screenshots and long runs
  AUTOPAUSE: true,     // pause when the tab is hidden (switched off only for screenshots)
};
