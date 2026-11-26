# Floating layers

Family: Screen and UI. Status: draft. Depth: full.

The interface opens in space: real screens become lit glass layers you can fly between.

- **Use it for:** Apps, design tools, dashboards, developer tools, any product whose power is in its screens.
- **Not for:** A product with no UI, a story about people.
- **Look:** The app's real UI on rounded glass panels with soft shadows and a gentle reflection, floating in a bright coloured space with depth and haze. The panels are big: the active one fills most of the frame.
- **Motion:** The camera glides between panels; a cursor or a highlight leads the eye; panels slide forward when they matter and back when they do not.
- **Type:** One big line above or below the active panel; the UI itself carries the rest.
- **Sound:** Soft UI clicks and swishes on each action, a light pulse, a lift on each new panel.
- **Build with:** The HTML kit with CSS 3D transforms (`perspective` on a stage, `translateZ` per panel), the app's own CSS and components when possible.
- **Hook:** Frame 0 is the result screen already done (the finished report, the generated design), tilted in space; then the layers show how.
- **It fails when:** Panels are small in a dark void, the UI is blurry or fake, panels swing with no reason, everything is the same distance away.

## The world
- A light or saturated gradient space (the brand colour), never black; haze and a floor glow give depth.
- Three depths at most: the active panel near, two supporting panels behind, a soft shape far away.
- Real UI, real copy, placeholder data that looks real.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Glide from panel to panel | "one flow" | between steps |
| Push into a panel until it is flat and full | "now we use it" | an action |
| Pull back to all panels | "it all fits together" | the peak |
| Slow parallax drift | "alive" | under reads |

## Three ways to shape it
1. Result first: the finished output, then the three steps that made it, then back to the result.
2. One action, many layers: a single click sends a ripple through every layer.
3. From chaos to order: messy windows fly into a clean stack.

## Signature moves
- A cursor that never stops: it leads every move.
- A panel that flips forward and becomes full screen without a cut.
- Data flowing as a light line from one panel to the next.

## Build notes
One stage element with `perspective: 1800px`; each panel is a div with the real UI, `border-radius`, `box-shadow`, and a `translate3d` and `rotateY` computed from `t` with kit eases. Keep the active panel at least 80% of the frame width in 9:16. Mark readable text with `data-say`.

## Make it yours
- Safe to change: panel count, tilt angles, the colour of the space.
- Changes its character: flat screen recordings, hard cuts between screens.
- Never change: real UI, big active panel, depth.
