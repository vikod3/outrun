/* ?tune — a dev-only slider panel for the main constants, with the fairness harness one click away.
   Not part of the design; never mounted without the query flag. */
import { C } from './config.js';
import { runSim } from './sim.js';

const KEYS = [
  ['JUMP_V0', 8, 16, .1], ['JUMP_SPEED_K', 0, .3, .01], ['MIN_JUMP', 30, 140, 1], ['DROP_V', 2, 12, .5],
  ['THRUST_MAX', 0, 60, 1], ['THRUST_G', .05, 1, .01], ['MAX_JUMP', 100, 240, 1], ['GRAVITY', .3, 1.2, .01],
  ['ACCEL', 0, .005, .0001], ['REACT', 5, 55, 1], ['DRONE_SHARE', 0, 1, .01],
];

export function mountTune() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:13px;bottom:13px;z-index:9;width:280px;padding:13px;border-radius:13px;background:rgba(8,8,8,.75);backdrop-filter:blur(21px);font:12px/1.4 "Inter Tight",sans-serif;color:#eef4f8;user-select:auto';
  el.innerHTML = KEYS.map(([k, min, max, step]) =>
    `<label style="display:grid;grid-template-columns:96px 1fr 44px;gap:8px;align-items:center"><span>${k}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${C[k]}" data-k="${k}" style="accent-color:#7eb0cb">
      <output>${C[k]}</output></label>`).join('') +
    '<div style="display:flex;gap:8px;margin-top:8px"><button data-sim style="padding:5px 8px;border-radius:5px;background:#eef4f8;color:#080808">Run sim</button><button data-copy style="padding:5px 8px;border-radius:5px;background:rgba(238,244,248,.146);color:#eef4f8">Copy JSON</button></div><pre data-out style="margin-top:8px;white-space:pre-wrap;color:rgba(238,244,248,.618)"></pre>';
  el.addEventListener('keydown', (e) => e.stopPropagation());
  el.addEventListener('input', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    C[k] = Number(e.target.value); e.target.nextElementSibling.textContent = C[k];
  });
  el.querySelector('[data-sim]').addEventListener('click', () => {
    const r = runSim();
    el.querySelector('[data-out]').textContent = `${r.pass ? 'PASS' : 'FAIL'}\n` + Object.entries(r.checks).map(([k, v]) => `${v ? '✓' : '✗'} ${k}`).join('\n');
  });
  el.querySelector('[data-copy]').addEventListener('click', () => {
    navigator.clipboard?.writeText(JSON.stringify(Object.fromEntries(KEYS.map(([k]) => [k, C[k]])), null, 1));
  });
  document.body.append(el);
}
