/* The launch (stage 8: "the dive"; was the stage 4.1 liquid-glass wipe, which the user found calm and boring). START
   uploads the clip's current frame and the game's first frame as two textures, and a WebGL2 shader dives from one into
   the other over 1.1 s, toward the viewer:
   - A · the pull (p 0 → .6, ease-in, accelerating): the clip zooms toward a centre point (×1 → ×3.4) with a radial
     zoom blur along the ray to the centre, a slight RGB split along the rays and a vignette closing in. The centre
     glides from the middle of the screen to where the Roadster stands in the game.
   - B · the arrival (p .45 → 1): the game opens through a circular iris from that point (smoothstep), with a thin ice
     rim like the ring's arc light; inside it the game starts zoomed in (×2.2) and blurred and settles to ×1 on an
     expo-out (decelerating).
   p 0 is exactly the clip (the canvas fades in over .2 s under body.is-launch, so a sub-percent difference between the
   GL upload and the compositor's video never steps) and p 1 exactly the game canvas, so nothing pops at either end. The
   hero UI is not in the textures: CSS flies it past the camera over the first .45 s. Reduced motion or no WebGL2 → the
   caller falls back to the plain crossfade. */
const VERT = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uA, uB;
uniform vec2 uRes, uC, uFade; uniform vec4 uCov, uBox; uniform float uP, uT;
out vec4 o;
const int TAPS = 8;
const vec3 VOID = vec3(8. / 255.);
/* the clip as the page shows it: cover-fit inside its box (phones: the top 70 %), the page's black outside it, and on
   phones the foot melting into black through the .hero__fade overlay (gradient × its mask; the blur as a mip bias) */
vec3 clip(vec2 uv, float lod) {
  vec2 b = (uv - uBox.xy) / (uBox.zw - uBox.xy);
  if (b.x < 0. || b.x > 1. || b.y < 0. || b.y > 1.) return VOID;
  float t = uFade.x > uFade.y ? clamp((uFade.x - uv.y) / (uFade.x - uFade.y), 0., 1.) : 0.;
  float m = clamp(t / .55, 0., 1.);
  return mix(texture(uA, b * uCov.xy + uCov.zw, lod + m * 3.).rgb, VOID, t * m);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float a = clamp(uP / .6, 0., 1.); a = a * a * a;                     /* the pull accelerates */
  float bl = clamp((uP - .45) / .55, 0., 1.);
  float b = bl >= 1. ? 1. : 1. - pow(2., -10. * bl);                   /* the arrival decelerates (expo-out) */
  vec2 c = mix(vec2(.5), uC, smoothstep(0., .6, uP));                  /* the dive's centre glides to the Roadster */
  vec2 d = uv - c;
  float r = length(d * vec2(asp, 1.));
  float rMax = length(max(c, 1. - c) * vec2(asp, 1.));
  float R = bl * bl * (3. - 2. * bl) * (rMax + .12);                   /* the iris: opens from a point, eased both ways */
  float mask = smoothstep(R - .06, R, r);                              /* 1: still the clip, 0: the game */
  vec3 col = vec3(0.);
  if (mask > 0.) {
    float sA = 1. + 2.4 * a, blurA = .32 * a, lod = a * 2.5;
    vec3 A = vec3(0.);
    for (int i = 0; i < TAPS; i++) A += clip(c + d / (sA * (1. + blurA * float(i) / float(TAPS - 1))), lod);
    A /= float(TAPS);
    float split = .008 * a;                                            /* the RGB split along the ray */
    vec2 q = c + d / sA;
    A.r = mix(A.r, clip(q + d * split, lod).r, .5 * a);
    A.b = mix(A.b, clip(q - d * split, lod).b, .5 * a);
    A *= 1. - a * smoothstep(.25, 1.1, r);                             /* the vignette closes in */
    col += A * mask;
  }
  if (mask < 1.) {
    float sB = 1. + 1.2 * (1. - b), blurB = .3 * (1. - b), lod = (1. - b) * 2.5;
    vec3 B = vec3(0.);
    for (int i = 0; i < TAPS; i++) B += texture(uB, c + d / (sB * (1. + blurB * float(i) / float(TAPS - 1))), lod).rgb;
    col += B / float(TAPS) * (1. - mask);
  }
  col += exp(-pow((r - R) / .018, 2.)) * (1. - b) * step(.0001, b) * .38 * vec3(.81, .9, .98);   /* the ice rim */
  o = vec4(col, 1.);
}`;

export function createWipe(canvas, { duration = 1100 } = {}) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uA', 'uB', 'uRes', 'uC', 'uCov', 'uBox', 'uFade', 'uP', 'uT']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1);
  const tex = (unit) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const texA = tex(0), texB = tex(1);
  const upload = (unit, t, src) => {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
  };

  let W = 0, H = 0;
  function frame(p, t) {
    gl.uniform1f(U.uP, p); gl.uniform1f(U.uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* from: the <video> at its scrubbed frame (cover-fit, like CSS object-fit: cover); to: the game canvas (1:1);
     center: where the dive lands, in 0–1 of the screen with y down (the Roadster); fade: the phone's .hero__fade overlay */
  function run({ from, to, center, fade }) {
    prepare(from, to, center, fade);
    frame(0, 0);                                               // the first frame is the clip itself: no pop
    return new Promise((resolve) => {
      const t0 = performance.now();
      let done = false, raf = 0;
      const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); frame(1, duration / 1000); resolve(); };
      const tick = (now) => {
        const x = Math.min(1, (now - t0) / duration);
        frame(x, (now - t0) / 1000);                             // the shader eases each phase itself
        if (x >= 1) finish(); else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      setTimeout(finish, duration + 400);                      // a throttled tab still gets to the game
    });
  }

  /* size the buffer to the element; map the clip exactly as the page lays it out (its box, cover-fit, object-position,
     the phone fade); set the dive's centre; upload both frames */
  function prepare(from, to, center = { x: .5, y: .5 }, fade = null) {
    const dpr = Math.min(1.5, devicePixelRatio || 1);          // 1.5 is as sharp as the 1920 clip and saves ~45 % of the fill on dpr 2
    const cr = canvas.getBoundingClientRect();
    W = cr.width; H = cr.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    const vr = from.getBoundingClientRect();                   // GL uv runs up from the bottom
    gl.uniform4f(U.uBox, (vr.left - cr.left) / W, 1 - (vr.bottom - cr.top) / H, (vr.right - cr.left) / W, 1 - (vr.top - cr.top) / H);
    const vw = from.videoWidth || vr.width, vh = from.videoHeight || vr.height, k = Math.max(vr.width / vw, vr.height / vh);
    const sx = vr.width / k / vw, sy = vr.height / k / vh;
    const [ox, oy] = getComputedStyle(from).objectPosition.split(' ').map((v) => (parseFloat(v) || 50) / 100);
    gl.uniform4f(U.uCov, sx, sy, (1 - sx) * ox, (1 - sy) * (1 - oy));   // the texture is flipped: offsets count from the bottom
    const fr = fade && getComputedStyle(fade).display !== 'none' ? fade.getBoundingClientRect() : null;
    gl.uniform2f(U.uFade, fr ? 1 - (fr.top - cr.top) / H : 0, fr ? 1 - (fr.bottom - cr.top) / H : 0);
    gl.uniform2f(U.uC, center.x, 1 - center.y);              // GL's y runs up
    upload(0, texA, from); upload(1, texB, to);
  }

  /* dev: upload both sources and hold one frame at progress p — no animation, nothing resolves */
  function preview({ from, to, center, fade }, p = .5, t = .45) { prepare(from, to, center, fade); frame(p, t); }

  return {
    run,
    preview,
    /* dev: draw one frame at progress p (the textures must have been uploaded by run) */
    frame,
    get size() { return [W, H]; },
  };
}
