# Swiss grid

Family: Minimal motion. Status: draft. Depth: full.

A poster that moves: a strict grid, bold type and shapes that slide into place with precision.

- **Use it for:** Studios, design tools, fintech, conferences, editorial products, a calm and confident launch.
- **Not for:** Playful kids' products, emotional stories, 3D hardware hero shots.
- **Look:** A visible or implied 12 column grid, one sans serif in two weights, flat primary colours plus off white, big numbers, aligned blocks, generous space.
- **Motion:** Blocks slide along the grid lines only (never diagonal), with firm eases; rules draw across; numbers count to their value; everything snaps to the grid.
- **Type:** Large left aligned headlines, small precise captions, numbers as heroes.
- **Sound:** A tight, minimal beat; a tick for each block landing; a soft click for counters.
- **Build with:** The HTML kit with CSS grid and absolute positions from `t`; SVG for lines.
- **Hook:** Frame 0 is the final poster, complete and beautiful; then it takes itself apart and rebuilds with meaning.
- **It fails when:** Elements float off the grid, too many colours, it looks like a slide template, it never builds to a peak.

## The world
- Off white or one strong colour background; black type; one accent colour used only for the key fact.
- Each beat is a new poster layout on the same grid, so the change feels like a page turn.
- Real data or the product's real UI cropped into a grid cell.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| No camera move; the layout moves | "precision" | most of the film |
| Slide the whole poster one column | "next idea" | between beats |
| Zoom into one cell until it is the next poster | "go deeper" | the turn |

## Three ways to shape it
1. Rules: each beat is one rule or ability, numbered 01 to 05, building one final poster.
2. One number: a single fact grows from a small caption to fill the whole grid.
3. The product as a poster: its UI is laid into the grid cell by cell.

## Signature moves
- A line that draws across the frame and pushes a block into place.
- A counter that lands exactly on a beat.
- The grid flashes visible for 6 frames at the turn.

## Build notes
Define the grid once (columns in px from the frame width) and place everything by column and row. Animate with `mv(t, a, b, from, to, 'softLand')`. Counters: show the final number from the start in `TEXTS` with `data-say` so the reading gate times the real value; draw the counting digits as the picture.

## Make it yours
- Safe to change: the accent colour, the font family, the grid size.
- Changes its character: diagonal moves, soft gradients, decoration.
- Never change: everything on the grid, flat colour, strong type.
