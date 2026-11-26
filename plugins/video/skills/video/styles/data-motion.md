# Data in motion

Family: Data and explanation. Status: draft. Depth: full.

One true number becomes something you can see and feel.

- **Use it for:** Research, reports, a measured result, product stats you can cite, a "how much time it saves" film.
- **Not for:** Claims without a source, a product with no numbers, invented metrics.
- **Look:** Clean charts rebuilt as objects (bars that are buildings, dots that are people, lines that are roads), a bright palette with one accent colour for the key value, big numbers.
- **Motion:** Values grow from the axis (never from nothing), lines draw with a head, dots flow; the camera moves along the data to the key point.
- **Type:** The number is the headline (200 px or more in 9:16); a short line says what it means; the source in small type at the end.
- **Sound:** A rising tone as values grow, a tick per data point, a hit on the key number.
- **Build with:** The HTML kit (SVG or canvas charts) driven from a small JSON of real data with its source.
- **Hook:** Frame 0 is the most surprising number, huge, with a picture that makes it real.
- **It fails when:** The numbers are invented or rounded to impress, the chart is tiny, too many series, no source.

## The world
- Each act is one chart type turned into a picture; the background colour changes per act.
- The accent colour is only for the number that matters.
- Real units, real scale; never cut an axis to exaggerate.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Ride the line as it draws | "this is the trend" | a time series |
| Pull back from one dot to thousands | "scale" | a big count |
| Rack focus to the highlighted value | "this one" | the key fact |

## Three ways to shape it
1. One number, three pictures of it (time, money, distance).
2. Before and after: the same chart with and without the product.
3. A journey along one line from the start date to today.

## Signature moves
- A counter that lands on the exact real value on a beat.
- Dots that flow from one chart into the next.
- A bar that grows taller than the frame and becomes the next scene.

## Build notes
Keep data in `data.json` with a `source` field and print the source on the end card. Report the final number in `TEXTS` from the moment it appears (so the reading gate times the real value). Ease growth with `E.softLand`; never animate from zero height to full in under 8 frames.

## Make it yours
- Safe to change: chart types, colours, metaphors.
- Changes its character: many numbers per beat, tables.
- Never change: every number true and sourced.
