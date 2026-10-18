/* Fixed 60 Hz simulation, rendered on rAF with interpolation (alpha = how far we are into the next step), so the
   motion stays smooth on 120 Hz displays. At most 5 steps per frame; a long stall drops the backlog instead of
   fast-forwarding. */
export function createLoop({ step, render, fps = 60 }) {
  const dt = 1000 / fps;
  let acc = 0, last = 0, raf = 0;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (!last) last = t;
    acc += Math.min(250, t - last);
    last = t;
    let n = 0;
    while (acc >= dt && n < 5) { step(); acc -= dt; n++; }
    if (n === 5) acc = 0;
    render(acc / dt);
  };
  return {
    start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
