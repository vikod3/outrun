# Roadster: Outrun (new-17) — CDN build

Byte-for-byte the site as built, with **every media file remote**. The hero clip, its poster, the eight sprites, the
four parallax plates, the apple-touch-icon and the og image live on Higgsfield storage: CloudFront, `access-control-allow-origin: *`, byte ranges for the clip's scrub, sha-256 identical to `../new-17/assets`. The fonts come from Google Fonts.
**It needs an internet connection.** For a copy that runs with the network off, use `../new-17-offline` (live at
https://new-17.vercel.app).

```bash
npx serve . -l 5200
```

`file://` will not work: ES modules and the clip's range requests need a real HTTP origin.

**CORS matters here.** The `<video>` carries `crossorigin="anonymous"` and every sprite image loads with
`crossOrigin = 'anonymous'`. Otherwise a cross-origin image would taint the game canvas, and the WebGL launch (the
dive, `lib/wipe.js`) could not read the clip's frame or the game's first frame. Verified: the canvas stays readable and
the launch lands in 1.1 s.

The favicon is inlined in `index.html` as an SVG data URI. The sprite and plate URLs are the `MEDIA` map in
`lib/game/sprites.js`.

## Media

| local (in `../new-17`) | URL |
|---|---|
| `assets/hero/hero-orbit.mp4` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/43096634-72ec-43f7-a7b8-a18d7e2c3c9a.mp4 |
| `assets/hero/hero-orbit-poster.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/570c439d-91fe-4c23-a3c6-449e68bb467d.webp |
| `assets/sprites/roadster-body.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/3841637c-9b03-4d7c-908b-ec0936dbde33.webp |
| `assets/sprites/roadster-wheel.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/55fc63de-816b-44c0-a035-563fc5099929.webp |
| `assets/sprites/police.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/53136404-e2f9-4979-a789-4bc5ee3fe29a.webp |
| `assets/sprites/drone.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/62de276d-18b5-4016-894a-d9e524fa0d25.webp |
| `assets/sprites/jet.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/7dd10b87-3882-4a55-85b0-b5bf9992dfbe.webp |
| `assets/sprites/cloud.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/0131a2a6-e28b-4a3e-aa87-5cce2c4c075f.webp |
| `assets/sprites/tanker.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/75837e22-df55-48fc-aae8-b9f7e928341a.webp |
| `assets/sprites/courier.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/aab79594-644f-45bc-ac27-b9c91246df97.webp |
| `assets/bg/sky.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/cbac3c42-ef7c-4f16-9e05-fbb380a4fade.webp |
| `assets/bg/far.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/05c77077-afc2-4721-a745-cdc7a97d1876.webp |
| `assets/bg/mid.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/cbeea2bf-12e7-43b8-8823-9facca81a527.webp |
| `assets/bg/ground.webp` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/dcacd927-e04e-42ef-8a45-b1fa36f9ef26.webp |
| `assets/ui/apple-touch-icon.png` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/40751db3-2056-4ed3-9243-04da1895d898.png |
| `assets/ui/og.jpg` | https://d2ol7oe51mr4n9.cloudfront.net/user_3GJaYKPxdnQG0Q9O26lu6DPmcHu/474f1f18-3974-4c09-8c23-14c92320d11b.jpg |

`DESIGN.md` is the spec: hand it over with `index.html`, `style.css`, `tokens.css`, `main.js` and `lib/`, and the site
can be rebuilt without any local file.

Fan concept, not affiliated with Tesla, Inc.
