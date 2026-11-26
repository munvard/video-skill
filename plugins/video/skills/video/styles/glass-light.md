# Glass and light

Family: Cinematic 3D. Status: draft. Depth: full.

Calm, expensive and abstract: light moves through thick glass and becomes the idea.

- **Use it for:** AI and audio products, finance, a premium brand film, a launch that should feel quiet and sure.
- **Not for:** A busy feature tour, comedy, a product that must show many screens.
- **Look:** One or two glass forms, a warm and a cool light, a soft floor, real refraction with a little colour split at the edges. Background never black: a deep lit colour.
- **Motion:** Slow, heavy, deliberate. Light drifts, the glass turns, the camera breathes in. One fast move at the peak.
- **Type:** One short line at a time in a light serif or a clean sans, large, with space around it.
- **Sound:** Soft pads, a low pulse, glassy bells on the hits, a deep swell at the peak.
- **Build with:** `ray.js` for abstract glass shapes (path traced), Blender Cycles for a glass product, HTML for the type.
- **Hook:** Frame 0 is the most beautiful light of the film, already lit, with the claim in big type.
- **It fails when:** The glass sits in darkness, the light is flat, it turns into a screensaver with no idea, the type is thin and small.

## The world
- Two lights of different colour, one on each side, so the glass shows both in its edges.
- A coloured gradient background, never pure black; a soft floor reflection grounds the forms.
- The glass is thick (refraction needs depth); a word or the logo seen through it bends.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Slow push in (2 to 4% a second) | "look closer" | under every line |
| Orbit 15 to 30 degrees | "it is real and solid" | the product reveal |
| Rack focus from glass to word | "the idea comes into focus" | the turn |
| One fast spin of the light | "it works" | the peak |

## Three ways to shape it
1. Light becomes the product: a point of light enters, passes through the glass and comes out as the logo.
2. Many into one: scattered light beams are bent by the glass into one beam (problem to answer).
3. A loop: the light circles the glass once; the last frame meets frame 0.

## Signature moves
- A word behind the glass, bent and then straightened as the glass turns.
- A colour split rainbow edge that crosses the frame on the peak hit.
- The glass catches the light exactly on a bar of the music.

## Build notes
In `ray.js`, glass needs bounces 6 or more, `disp` for the colour split and a light texture behind it; render a 10 frame test at final size and measure seconds a frame before planning length. Keep shots short (2 to 4 s) and few. Type goes on the HTML layer, never in the shader.

## Make it yours
- Safe to change: the forms, the two colours, the font.
- Changes its character: many objects, fast cutting, hard light.
- Never change: real refraction, slow motion, a lit background.
