# Engines

Use what ships in the kit first. Measure before you promise a render time.

| Need | Engine | Speed on a normal gaming PC (measure yours) |
|---|---|---|
| Motion design, type, UI, product screens, 2D worlds | HTML page + `kit/render.mjs` (DOM, CSS, canvas, SVG) | often 0.02 to 0.1 s a frame with 3 workers |
| Canvas scenes with real motion blur | `scene({...})` in `kit.js` | 0.05 to 0.5 s a frame (blur samples cost) |
| Depth with live screens, abstract 3D | WebGL in the page (your own shaders, or `ray.js`) | `ray.js` path tracing: seconds a frame at 1080x1920 |
| Real objects, rich 3D worlds, products | Blender EEVEE (`reference/blender.md`) with CC0 assets | about 1 to 5 s a frame |
| Two or three hero shots with physical light | Blender Cycles | about 30 to 150 s a frame at 1080x1920 |
| Real proof (the app doing the job) | a scripted screen recording on a test account, played inside the film | real time |
| Music, effects, voice, master | `scripts/sound.py`, `voice.py`, `finish.py` | seconds |
| Checks | `scripts/check.py`, `study.py` | seconds |

Rules:
- QUICK films stay in the HTML kit. STUDIO films may add Blender plates; type and UI stay in HTML on top so words stay
  sharp and can change.
- `ray.js` is for short abstract shots (glass, light, a hero object made of shapes). It cannot make a rich world: for
  that, place real assets in Blender.
- Before any render slower than real time: render 10 frames at final size, measure seconds a frame, multiply, and write
  it in the plan. Tell the user before a render over 2 hours. One heavy render at a time.
- Use `--workers 1` or `2` for heavy WebGL pages; Chrome keeps only 16 WebGL contexts.
- Generated images or video from a paid model only when the user accepts the cost and the platform label.
- Keep 10 GB or more free. Big frame folders go where there is space; delete only your own temporary files.
