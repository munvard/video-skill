# Screen cinema

Family: Screen and UI. Status: draft. Depth: full.

The product really working, filmed like a movie: a real take inside a lit device, with a camera that cares.

- **Use it for:** Proof that a feature works; the moment people would not believe in a drawing.
- **Not for:** A product with nothing on screen worth seeing, or private screens.
- **Look:** A real recording (a test account with demo data) mapped onto a premium device or a floating screen in a lit space; depth of field, reflections and a warm rim light.
- **Motion:** The camera follows the action inside the take (the cursor, the typing, the result) with a slow push; it settles on the result.
- **Type:** One short line that says what is happening, outside the screen, never over the action.
- **Sound:** The real interaction sounds made clean (keys, clicks, a done chime) over a low pulse.
- **Build with:** A scripted screen recording cut to PNG frames, played with `seq()` or a video element inside an HTML page with CSS 3D, or as a texture in Blender.
- **Hook:** The take starts at its most impressive second; the film explains it after.
- **It fails when:** The recording is small, blurry, slow, or shows a real person's data; a flat screen recording with a title on top.

## The world
- The device sits in a world that matches where the product is used (a desk at night with a lamp, a bright kitchen counter, a studio).
- The screen glows and lights the world around it.
- Crop the take to what matters; nobody needs the menu bar.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Push from device to screen | "watch this" | the start of a take |
| Track the cursor | "this is the action" | every click |
| Punch in on the result (8 frames) | "look" | the payoff |
| Pull back to the device | "it is real" | the end of a take |

## Three ways to shape it
1. One impossible task done for real, start to finish, sped up in the boring middle (say so in the post text).
2. Three short real takes, each one a different wow, joined by the device turning.
3. The race: the same job by hand and with the product, side by side, real clocks.

## Signature moves
- The screen becomes the frame: push until the take fills the frame, keep going inside it.
- A light sweep across the glass on the result.
- The result card flies out of the screen into 3D space.

## Build notes
Record at 2x the final size on a test account; cut the take into PNG frames with ffmpeg; map it with CSS 3D (`transform: perspective(...) rotateY(...)`) or Blender. Blur or replace any personal data before it reaches a frame. Keep speed-ups honest and say them in the post text, not on the picture.

## Make it yours
- Safe to change: the device, the world, the speed of the boring parts.
- Changes its character: a flat full-screen recording, fake UI.
- Never change: the take is real, the data is not anyone's.
