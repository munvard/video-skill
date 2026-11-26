# The kit

Everything a film needs to render on your own computer, with no npm install: Node 22+, ffmpeg and Chrome, Chromium or
Edge. In a plugin install the folder is `${CLAUDE_SKILL_DIR}/kit`.

| File | What it is |
|---|---|
| `render.mjs` | Renders a film page to a silent mp4 (parallel workers), stills, or PNG frames. Writes `<out>.meta.json`. |
| `kit.js` | 2D helpers: eases (`E`, 12 measured curves, `mv`), `seg`, `lerp`, `mix`, seeded `rng`, noise, `say` and `domTexts` (texts the checks read), `seq` (image sequences), `scene` (a canvas film with real sub-frame motion blur). |
| `ray.js` | A WebGL2 path tracer for signed distance fields: area lights, soft shadows, glass, depth of field, haze, motion blur, denoiser, bloom. For short hero shots of abstract objects; Blender is better for real objects. |
| `fonts.css`, `fonts/` | Inter, Fraunces, JetBrains Mono, Caveat, Bangers (all OFL). |
| `templates/film.html` | A starter film page that follows the contract. |
| `page.html` | The empty page used by `--scene` mode. |

## The page contract

A film is one HTML page (or several, joined later). The page sets:

- `window.DUR`: length in seconds. `window.FPS` (default 30) and `window.SIZE = [w, h]` (default 1080x1920).
- `window.render(t)`: draws the frame at `t` seconds. It may return a promise. It must be a pure function of `t`: no
  state from the last frame, no real time. The renderer gives every worker the same seeded `Math.random`, and
  `Date.now` and `performance.now` follow `t`, and it parks every CSS animation at `t`.
- `window.READY` (optional): a promise that resolves when fonts, images and models are loaded.
- `window.EV` (optional): sound events `[{t, type, gain, pan}]`. Types: whoosh, hit, impact, click, tick, pop, swish,
  riser, drop, shimmer, thud, type, glass, bell. `scripts/sound.py sfx` turns them into sound.
- `window.TEXTS(t)` (optional but expected): every text on screen at `t`, `[{id, text, x0, y0, x1, y1, px, colors}]` (`colors`: the CSS colours of the words, for the contrast gate; `domTexts` and `say()` fill it in). For
  HTML text, mark elements with `data-say="id"` and set `window.TEXTS = domTexts`. For canvas text, draw it with
  `say(c, id, text, x, y, px, font, fill, align)`. `scripts/check.py` uses it for reading time, text size and safe area.

The page is served from its own folder at `/`, and the kit at `/kit/`, so a page links `/kit/kit.js` and
`/kit/fonts.css`, and its own files by relative path.

## Commands

```
node SK/kit/render.mjs film.html --out out/draft1.mp4                 # the whole film, 3 workers
node SK/kit/render.mjs film.html --out out/test.mp4 --from 4 --to 10  # a 6 s moving test
node SK/kit/render.mjs film.html --stills 0,3.5,9 --still-dir out/look   # full size stills for the look gate
node SK/kit/render.mjs --scene my_scene.js --png-dir out/frames          # a kit scene() to PNG frames
```

Options: `--fps`, `--size 1080x1920`, `--workers N` (use 1 or 2 for heavy WebGL), `--crf`, `--jpeg`. Set `CHROME` if
the browser is not found, and `CHROME_FLAGS` to replace the GPU flags. Every render gets a new `--out` name: never
overwrite a draft.
