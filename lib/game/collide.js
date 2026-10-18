/* Box lists per sprite, as Dino's CollisionBox: test the outer box first, then the inner boxes.
   Boxes are in world units: l / r along the road, b / t as heights above it. */
import { C } from './config.js';

const toWorld = (boxes, ox, y0, h) => boxes.map(([x, y, w, bh]) => ({ l: ox + x, r: ox + x + w, b: y0 + (h - y - bh), t: y0 + (h - y) }));

export const playerBoxes = (p, px) => toWorld(C.CAR.boxes, px, p.y, C.CAR.h);

export function obstacleBoxes(o) {
  if (o.kind === 'drone') return toWorld(C.DRONE.boxes, o.x, o.y0, C.DRONE.h);
  if (o.kind === 'courier') return toWorld(C.COURIER.boxes, o.x, 0, C.COURIER.h);
  const out = [];
  if (o.kind === 'tanker') {
    for (let i = 0; i < o.n; i++) out.push(...toWorld(C.TANKER.boxes, o.x + i * (C.TANKER.w + C.TANKER.gap), 0, C.TANKER.h));
    return out;
  }
  for (let i = 0; i < o.n; i++) out.push(...toWorld(C.POLICE.boxes, o.x + i * (C.POLICE.w + C.POLICE.gap), 0, C.POLICE.h));
  return out;
}

const overlap = (a, b) => a.l < b.r && a.r > b.l && a.b < b.t && a.t > b.b;

export function hits(p, px, o) {
  const outerP = { l: px, r: px + C.CAR.w, b: p.y, t: p.y + C.CAR.h };
  const outerO = { l: o.x, r: o.x + o.w, b: o.y0, t: o.y0 + o.h };
  if (!overlap(outerP, outerO)) return false;
  const pb = playerBoxes(p, px);
  const ob = obstacleBoxes(o);
  return pb.some((a) => ob.some((b) => overlap(a, b)));
}
