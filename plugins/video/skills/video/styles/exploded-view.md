# Exploded view

Family: Cinematic 3D. Status: draft. Depth: full.

The object opens in the air and explains itself, layer by layer, then closes again.

- **Use it for:** Hardware, engineering, a device with clever insides; an app shown as layers (UI, logic, data).
- **Not for:** A product with one simple part, an emotional story.
- **Look:** A premium object on a calm, bright background; parts float apart along clear axes with even gaps; thin leader lines and labels only where needed.
- **Motion:** The object turns to a three-quarter view, parts slide out in order with measured eases, hold, then snap back together on a beat.
- **Type:** A short name for each layer, placed beside it (never over it), one at a time.
- **Sound:** A soft mechanical slide for each part, a click when it all closes, a clean pulse underneath.
- **Build with:** Blender EEVEE (Cycles for the closed hero shot); for app layers, HTML with CSS 3D transforms or the kit's canvas.
- **Hook:** Frame 0 shows the object already fully exploded, a striking picture; then it closes and the film explains it.
- **It fails when:** Parts fly randomly, labels overlap, the gaps are uneven, the object looks hollow or blocky.

## The world
- One background colour with a soft gradient and a floor shadow, so floating parts still feel grounded.
- Every part has a real material; the inside is as finished as the outside.
- Labels are thin, high contrast, and sit on the side with the most space.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Three-quarter orbit, slow | "this is a real thing in space" | the whole film |
| Push in on one layer | "this part matters" | each feature |
| Top view of all parts in a row | "everything it is made of" | the peak |
| Close-up of the snap together | "it is one" | the end |

## Three ways to shape it
1. Open, explain, close: the classic, one layer per beat.
2. Built from nothing: parts arrive from out of frame and stack into the product.
3. The one hidden part: everything opens, one glowing part is the star (the chip, the engine, the idea).

## Signature moves
- Parts leave in order from outside to inside with a fixed delay (3 to 5 frames each).
- The snap back: all parts return in 10 frames with `snapSettle` and one loud click.
- A light passes through the open layers.

## Build notes
In Blender, parent each part to an empty and key its offset along one axis; drive the order from a list. For an app, each layer is a lit glass panel in CSS 3D (`perspective`, `rotateX` 55 to 65 degrees) with real UI inside. Text and leader lines in HTML on top.

## Make it yours
- Safe to change: the axes, the number of layers, the colours.
- Changes its character: random explosion, cutting instead of moving.
- Never change: clear order, even gaps, finished insides.
