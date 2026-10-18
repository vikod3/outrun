/* Seeded RNG (mulberry32), so a run, a test and the harness repeat exactly. */
export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.seed = (s) => { a = s >>> 0; };
  return rng;
}
