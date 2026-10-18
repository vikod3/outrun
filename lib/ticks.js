/* The tick language shared by the hero ring (lib/ring.js) and the game's instruments (lib/game/telemetry.js): the ice
   ramp #2a556c → #cfe2ef that lit ticks run along, the colour helpers and the gaussian falloff. */
export const RAMP = [[42, 85, 108], [79, 134, 165], [126, 176, 203], [207, 226, 239]];
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));

export function rampRGB(t) {
  const x = clamp01(t) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), f = x - i;
  return RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * f));
}
export const rgb = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
export const toIce = (c, f) => c.map((v, k) => Math.round(v + (RAMP[3][k] - v) * clamp01(f)));
