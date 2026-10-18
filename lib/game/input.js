/* Keyboard + pointer → a queue of discrete events and one `held` flag.
   Jump: Space / ↑ / W / pointer. Pause: Esc. Confirm: Enter (Space also confirms where the game allows it).
   Key repeat is ignored, Space never scrolls, and losing focus releases the hold so it cannot stick. */
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);

export function createInput(surface) {
  const queue = [];
  let keyHeld = false, pointerHeld = false;

  addEventListener('keydown', (e) => {
    if (JUMP.has(e.code) || e.code === 'Enter') e.preventDefault();
    if (e.repeat) return;
    if (JUMP.has(e.code)) { keyHeld = true; queue.push('press'); }
    else if (e.code === 'Enter') queue.push('confirm');
    else if (e.code === 'Escape') queue.push('pause');
  });
  addEventListener('keyup', (e) => {
    if (JUMP.has(e.code)) { keyHeld = false; queue.push('release'); }
  });
  surface.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointerHeld = true; queue.push('press');
  });
  const up = () => { if (pointerHeld) { pointerHeld = false; queue.push('release'); } };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  addEventListener('blur', () => { keyHeld = false; pointerHeld = false; queue.push('release'); });

  return {
    get held() { return keyHeld || pointerHeld; },
    drain() { return queue.splice(0, queue.length); },
    /* dev hook / tests */
    inject(ev) {
      if (ev === 'press') keyHeld = true;
      if (ev === 'release') keyHeld = false;
      queue.push(ev);
    },
  };
}
