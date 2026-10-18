/* Stage-3 sprites (Higgsfield, style frame B; see prompts/ASSETS.md). Images are 10 px per game unit, so a sprite
   drawn at its C.* size in units maps 1:1 to its pixels. Each image is ready once loaded; until then the renderer
   keeps its placeholder, and `ready` resolves (also on errors) so the caller can redraw a paused canvas.
   Geometry below is measured from the images by tools/sprites.py, in units, y from the sprite's top. */
const BASE = new URL('../../assets/sprites/', import.meta.url);
const BG_BASE = new URL('../../assets/bg/', import.meta.url);

/* CDN build: the sprites and plates live on Higgsfield storage (CloudFront, CORS *, byte-identical to ../new-17/assets) */
const MEDIA = {
  "roadster-body.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/3841637c-9b03-4d7c-908b-ec0936dbde33.webp",
  "roadster-wheel.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/55fc63de-816b-44c0-a035-563fc5099929.webp",
  "police.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/53136404-e2f9-4979-a789-4bc5ee3fe29a.webp",
  "drone.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/62de276d-18b5-4016-894a-d9e524fa0d25.webp",
  "jet.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/7dd10b87-3882-4a55-85b0-b5bf9992dfbe.webp",
  "cloud.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/0131a2a6-e28b-4a3e-aa87-5cce2c4c075f.webp",
  "tanker.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/75837e22-df55-48fc-aae8-b9f7e928341a.webp",
  "courier.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/aab79594-644f-45bc-ac27-b9c91246df97.webp",
  "sky.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/cbac3c42-ef7c-4f16-9e05-fbb380a4fade.webp",
  "far.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/05c77077-afc2-4721-a745-cdc7a97d1876.webp",
  "mid.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/cbeea2bf-12e7-43b8-8823-9facca81a527.webp",
  "ground.webp": "https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/dcacd927-e04e-42ef-8a45-b1fa36f9ef26.webp"
};

const load = (file, base = BASE) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';   // the CDN build serves these from CloudFront: a CORS-clean image keeps the canvas readable for the launch
  /* the load event, not img.decode(): decode() can stay pending in a background tab, and drawImage decodes anyway */
  const done = new Promise((res) => { img.onload = () => res(true); img.onerror = () => res(false); });
  img.src = MEDIA[file] || new URL(file, base).href;
  return { img, done, get ok() { return img.complete && img.naturalWidth > 0; } };
};

export const SPRITES = {
  body: load('roadster-body.webp'),
  wheel: load('roadster-wheel.webp'),
  police: load('police.webp'),
  tanker: load('tanker.webp'),   // stage 6: the fuel truck, facing left (oncoming)
  courier: load('courier.webp'), // stage 7b: the delivery courier on a moped, facing right (we overtake him)
  drone: load('drone.webp'),
  jet: load('jet.webp'),       // vapour on black: screen blend
  cloud: load('cloud.webp'),   // vapour on black: screen blend
};

/* the parallax plates (style frame B): a static sky, then far ridges, mid dunes and the road, each a seamless loop
   (tools/plates.py) that scrolls with the world's own offsets (.1×, .4×, 1×) */
export const PLATES = {
  sky: load('sky.webp', BG_BASE),
  far: load('far.webp', BG_BASE),
  mid: load('mid.webp', BG_BASE),
  ground: load('ground.webp', BG_BASE),
};

/* plate layout in units: the road's far edge sits roadUp above the wheel line (so the cars drive on the asphalt, not
   on its edge); the far and mid plates stand on it, tucked a little under it; their heights follow frame B. The ground
   plate keeps frame B's scale (groundH, what it filled at 1470 × 956 before the field was lifted); its lower half
   repeats below it down to the screen's bottom; the pale edge line sits at `line` of its height. */
export const BG = { roadUp: 8, tuck: 2, farH: 64, midH: 26, groundH: 100, line: .27 };

export const ready = Promise.all([...Object.values(SPRITES), ...Object.values(PLATES)].map((s) => s.done));

export const GEO = {
  /* the Roadster (faces right): hubs, the spinning disc's radius, and the nozzle mouths. Four thrusters, two at each
     end: the rear pair is on the sprite; the front pair mirrors it about the middle of the wheelbase (60 units) and is
     stamped from the rear nozzle's lower ring (`stamp`, a source rect on the body image) under the front splitter */
  wheels: [{ x: 24.26, y: 19.91 }, { x: 95.83, y: 20.02 }],
  disc: 6.76,
  nozzles: [{ x: 6.3, y: 21.3 }, { x: 14, y: 26.6 }, { x: 106.1, y: 27.6, top: 25.8 }, { x: 113.8, y: 26.6, top: 24.8 }],
  stamp: { x: 12.4, y: 24.8, w: 3.4, h: 1.8 },
  /* police (faces left): the roof light bar, red half then blue half */
  bar: { x: 52, w: 9.6, y: .15, h: .7 },
  /* drone (gimbal toward the player): propeller hubs and blade reach, LED pods */
  props: [{ x: 7.4, y: .45, r: 6.6 }, { x: 37.9, y: .45, r: 6.6 }],
  leds: [{ x: 5.5, y: 3, c: 'blue' }, { x: 39.4, y: 3, c: 'red' }],
  /* vapour images: width / height */
  jetAspect: .566,
  cloudAspect: 6.789,
};
