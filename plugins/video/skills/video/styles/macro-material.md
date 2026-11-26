# Macro material

Family: Cinematic 3D. Status: draft. Depth: full.

So close you can almost feel it: the product's surface, edges and moving parts, huge and lit.

- **Use it for:** Hardware and gadgets, watches, audio gear, cosmetics, food, anything people buy for how it feels.
- **Not for:** Software with no physical form, explainers.
- **Look:** Extreme close-ups of real materials (brushed aluminium, glass, ceramic, soft-touch plastic, fabric), shallow depth of field, a rim light tracing every edge, one accent colour.
- **Motion:** Slow slides along surfaces, a focus pull to a detail, one mechanical move (a button presses, a hinge opens) per shot, then the pull back to the whole object.
- **Type:** Almost none until the end: one short line per shot, the name and one line on the end card.
- **Sound:** Close foley: a click, a hum, a slide, a magnetic snap, over a low pulse. Each detail has its sound.
- **Build with:** Blender Cycles for the 2 or 3 hero close-ups, EEVEE for the rest; CC0 PBR materials from Poly Haven or ambientCG.
- **Hook:** Frame 0 is a mysterious, beautiful close-up; the pull back at 2 s reveals what it is.
- **It fails when:** Materials look like plastic toys, the light is flat, the depth of field hides everything, the object never shows whole.

## The world
- A studio sweep in one calm colour that suits the product; the product is the only thing in sharp focus.
- Key light big and soft from the side, a hard rim from behind, a small fill. Roughness maps decide if it looks real.
- Dust, a fingerprint or a tiny scratch only if the brand allows it; perfection reads as CG.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Slide along a surface, 50 to 100 mm lens | "feel this" | material beats |
| Focus pull near to far | "now see the detail" | each feature |
| Locked shot, one part moves | "it works like this" | a mechanism |
| Pull back to the whole object | "here it is" | the reveal and the end |

## Three ways to shape it
1. Mystery to reveal: three close-ups that make you guess, then the whole object turns to camera.
2. Built in front of you: parts arrive and click together in close-up, ending on the finished product.
3. One detail per feature: each feature is a close-up with its sound and one word.

## Signature moves
- A rim light that travels along an edge exactly on the beat.
- The click: a button or a magnet snaps shut with a perfect sound and a tiny camera shake.
- The reveal turn: the object rotates into its hero angle as the music opens.

## Build notes
Fetch a model and materials with `scripts/assets.py`; if no fitting model exists, model the object with bevels and subdivision, never boxes. Cycles at adaptive sampling with the denoiser; motion blur on. Measure 10 frames first. Words go in HTML on top of the frames.

## Make it yours
- Safe to change: the backdrop colour, the lens, the detail order.
- Changes its character: wide shots, fast cuts, many objects.
- Never change: real materials, close focus, one detail at a time.
