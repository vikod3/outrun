/* Slider-scrubbed hero video (copied from new-14, scroll → slider) (house engine, design-dna MOTION "seek-coalescing
   scrubber"). The clip is local and all-intra (`ffmpeg -g 1`), so a plain
   `currentTime` seek lands on any frame in ~10ms and no frame bank is needed.
   - at most ONE seek in flight, always chasing the latest target (`seeked` → next);
   - 30ms dead zone (~¾ of a 24fps frame) so a settled scroll stops seeking;
   - poster-pin at rest: `loadedmetadata` → pause + currentTime .001;
   - warm the decoder once on `canplay` (seek to ~3% and back) so the first
     scroll seek is not a cold start;
   - `ready` resolves when metadata + first frame are in (or on error / 4s
     timeout, so a missing clip never blocks the hero intro);
   - `onFrame(fn)`: fn runs inside `seeked`, BEFORE the next seek goes out —
     the one moment a pixel consumer (e.g. a WebGL pass) sees a landed frame.
   Reduced motion: no scrubbing, the poster/first frame stays.
   Phones: a muted play() + pause primes the clip, since iOS loads nothing for a video that never played (below).
   Clip: assets/hero/hero-orbit.mp4 (the stage-3b night pursuit after tools/film.py: 6 s, all-intra), poster = frame 0.
   The <video> carries crossorigin="anonymous" so the CDN build's WebGL launch can read its frame. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHeroVideo(video = document.querySelector('[data-hero-video]')) {
  if (!video) return { scrub() {}, ready: Promise.resolve(), video: null };

  let pending = null;
  let seeking = false;
  const frameListeners = new Set();
  const applyNext = () => {
    /* a frame has landed: consumers take it now, then the next seek goes out */
    frameListeners.forEach((fn) => fn(video));
    if (pending === null) { seeking = false; return; }
    const t = pending; pending = null;
    if (Math.abs(video.currentTime - t) < 0.01) { seeking = false; return; }
    seeking = true;
    try { video.currentTime = t; } catch { seeking = false; }
  };
  video.addEventListener('seeked', applyNext);

  /* p01 ∈ [0,1] → clip time; a scrub before the metadata is in waits for it instead of being dropped */
  let late = null, last = 0.001;
  const scrub = (p01) => {
    if (reduced) return;
    const d = video.duration;
    if (!d || video.readyState < 1) { late = p01; return; }
    late = null;
    if (!video.paused) video.pause();
    const target = Math.min(d - 0.001, Math.max(0, p01 * d));
    last = target;
    if (!seeking && Math.abs(video.currentTime - target) < 0.03) return;
    pending = target;
    if (!seeking) applyNext();
  };

  /* phones: iOS Safari (and data-saving Android) fetch nothing for a video that has never played, whatever preload says,
     so seeks land nowhere and the hero stays on its poster. Prime it: a muted inline play() needs no gesture — start,
     then pause at once, which makes the browser fetch and decode. Where even that is refused (iOS Low Power Mode), the
     first touch or click anywhere primes it inside the gesture. */
  let primed = false, priming = false;
  const prime = () => {
    if (primed || priming) return;
    priming = true;
    video.muted = true;
    let p;
    try { p = video.play(); } catch { p = null; }
    const settle = () => { priming = false; primed = true; video.pause(); try { video.currentTime = last; } catch {} if (late !== null) scrub(late); };   // back to where the ring is
    if (p && p.then) p.then(settle, () => { priming = false; });
    else priming = false;
  };
  const onGesture = () => {
    prime();
    if (primed) { removeEventListener('touchstart', onGesture, true); removeEventListener('pointerdown', onGesture, true); }
  };
  addEventListener('touchstart', onGesture, { capture: true, passive: true });
  addEventListener('pointerdown', onGesture, { capture: true, passive: true });
  if (!reduced) prime();
  video.addEventListener('loadedmetadata', () => { if (late !== null) scrub(late); });

  const ready = new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const onMeta = () => { video.pause(); try { video.currentTime = 0.001; } catch {} };
    const onCanPlay = () => {
      /* prime the decoder: one seek forward and back, then we are ready */
      const warm = Math.min(0.12, (video.duration || 4) * 0.03);
      const back = () => { video.removeEventListener('seeked', back); try { video.currentTime = 0.001; } catch {} finish(); };
      video.addEventListener('seeked', back, { once: true });
      try { video.currentTime = warm; } catch { finish(); }
    };
    if (video.readyState >= 1) onMeta(); else video.addEventListener('loadedmetadata', onMeta, { once: true });
    if (video.readyState >= 3) onCanPlay(); else video.addEventListener('canplay', onCanPlay, { once: true });
    video.addEventListener('error', finish, { once: true });
    setTimeout(finish, 4000);
  });

  const onFrame = (fn) => { frameListeners.add(fn); return () => frameListeners.delete(fn); };
  return { scrub, ready, video, onFrame, get seeking() { return seeking; } };
}
