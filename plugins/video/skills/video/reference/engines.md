# Engines

Check what is installed before choosing. Prefer the engine that fits the picture.

| Need | Engine | Check first |
|---|---|---|
| Type, shapes, interface | HTML, SVG or canvas in headless Chrome, frame by frame | every frame is a pure function of time |
| Depth with live screens | WebGL | fixed time step, texture size, same GPU settings |
| Real light and material | Blender Cycles | one final still, then 10 frames to measure cost |
| Long stylised 3D | Blender EEVEE | shadows and reflections at final size |
| Real proof | scripted screen recording or camera footage | a test account, no private data |
| Generated images or video | only when the user accepts the cost and the platform label | rights, hands, text, identity between shots |
| Edit, mix, check | ffmpeg | frame count, loudness, peak, color range |

Never estimate a long render from a guess. Measure seconds per final frame, multiply, and tell the user before a render longer than 2 hours. Render one heavy job at a time. Keep free disk space for frames and the encode. Assets need a licence that allows the intended use, kept beside the asset with its source.
