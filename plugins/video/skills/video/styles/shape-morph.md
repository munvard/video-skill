# Shape morph

Family: Minimal motion. Status: draft. Depth: full.

Quiet and exact: every object turns into the next, so the film is one continuous transformation.

- **Use it for:** Software and AI products, a personal brand, a calm feature film, an idea that changes form.
- **Not for:** A loud comedy, a product that must be filmed for real.
- **Look:** Soft lit 2D or 2.5D shapes (gradients, a little shadow), a limited palette, one shape always in the centre of attention.
- **Motion:** Shapes squash, stretch and morph into the next object with eased paths; the morph happens on a beat; nothing appears from nowhere.
- **Type:** One short line per object, appearing after the morph settles.
- **Sound:** Soft synth swells under each morph, a gentle pop when it settles, a calm beat.
- **Build with:** The HTML kit with SVG path morphing or a canvas `scene()` with sub-frame motion blur.
- **Hook:** Frame 0 shows the final object (the product's icon or result) mid-morph, beautiful and bright.
- **It fails when:** Morphs pass through ugly in-between shapes, shapes pop in, the colours are dull, it feels like a loading animation.

## The world
- One background colour per act, switching softly with the morph.
- Light from one direction on every shape, so they feel like objects.
- Keep the shape count low: one hero, at most two helpers.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Locked frame, the shape moves | "watch it change" | most morphs |
| Follow the shape as it travels | "it is going somewhere" | between acts |
| Zoom into the shape to the next world | "inside the idea" | the turn |

## Three ways to shape it
1. Problem to product: a messy shape becomes an ordered one, then the logo.
2. A chain of things the product touches, each morphing into the next.
3. A loop: the last shape morphs back into frame 0.

## Signature moves
- Squash on landing, stretch on leaving (about 10 to 20%).
- The morph that matches two silhouettes at the half way point.
- A drop of colour that spreads and becomes the next background.

## Build notes
Give both shapes the same number of points before morphing, and morph in polar order from the centre to avoid twisting. Use `E.softInOut` for the morph and `E.popOver` for the settle. Canvas scenes get real motion blur with `blur: 8` to `16`.

## Make it yours
- Safe to change: the palette, the shapes, the lighting.
- Changes its character: cuts, many shapes at once, photographs.
- Never change: one continuous transformation, eased, on the beat.
