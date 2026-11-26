# The cursor is the hero

Family: Screen and UI. Status: draft. Depth: full.

A tiny cursor with a job: it moves like a character, and the product does the work around it.

- **Use it for:** Productivity tools, automation, AI agents, browser extensions, any "one click does it" product.
- **Not for:** Hardware, a product with no pointer, long explanations.
- **Look:** A clean, bright, rebuilt UI in the brand's colours, big enough to read on a phone; the cursor is large (3 to 4 times normal) with a soft shadow.
- **Motion:** The cursor accelerates, lands with a tiny overshoot, waits, clicks (a squash and a ripple). The camera follows it with a little lag and zooms in on each click.
- **Type:** The UI's own words; one short line above the action when needed.
- **Sound:** A soft whoosh for each glide, a crisp click, a rising tone as work completes, a pop for each result.
- **Build with:** The HTML kit: rebuilt UI in HTML and CSS, the cursor as an element moved by kit eases; or the real app's components.
- **Hook:** Frame 0: the cursor hovers over one huge glowing button with the promise on it ("Do it all"); the click happens at 1 s.
- **It fails when:** The cursor moves in straight robotic lines, the UI is tiny, the camera never follows, clicks have no feedback.

## The world
- A bright desktop or browser in the brand palette, slightly tilted in 3D for depth, with a soft shadow and a coloured backdrop.
- Everything the cursor touches reacts: hover glow, press, ripple.
- Results appear as satisfying cards that stack, fill or fly in.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Follow the cursor with a lag of 4 to 6 frames | "follow the hero" | every glide |
| Punch in 15 to 25% on a click (8 frames) | "this matters" | every important click |
| Pull back while results pile up | "look how much it did" | the peak |
| Tilt the whole UI slightly | "it is a real object" | under the whole film |

## Three ways to shape it
1. One click, everything happens: the cursor clicks once and the whole UI does a minute of work in 3 s.
2. A to do list: the cursor ticks every item, each tick is a different ability.
3. The chase: tasks fly in, the cursor catches each one.

## Signature moves
- The cursor's arc path (never straight), landing with `snapSettle`.
- A click ripple in the brand colour that pushes a light wave through the UI.
- The final double click that opens the logo.

## Build notes
Move the cursor along a quadratic curve between targets; time each glide 8 to 14 frames with `E.snapSettle`, each wait 6 to 10 frames. Put a sound event in `window.EV` on every click time. Camera = a CSS transform on the stage that follows the cursor with a lagged value.

## Make it yours
- Safe to change: cursor shape, UI style, colours.
- Changes its character: hiding the cursor, cutting between screens.
- Never change: the cursor leads, everything reacts to it.
