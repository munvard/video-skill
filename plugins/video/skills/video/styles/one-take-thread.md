# One take with a thread

Family: Cinematic 3D. Status: draft. Depth: full.

A single camera move through several worlds, led by one glowing object that is the product.

- **Use it for:** A launch film; any product that connects devices, places, people or steps.
- **Not for:** A 7 second post, or a product with one screen and one action.
- **Look:** Each act is its own lit world (warm room, bright glass desk, deep blue space, soft morning), joined by one bright thread of the brand colour.
- **Motion:** The camera rides or follows the thread, dives into a screen until it fills the frame, and comes out in the next world. It settles on every readable thing.
- **Type:** Few big words, one idea at a time, always in the safe area, never on a card between beats.
- **Sound:** The thread has a motif (three notes or a tone) that returns at every join and an octave up at the peak.
- **Build with:** Blender EEVEE worlds with CC0 assets for depth, HTML on top for type and UI; or one WebGL page per world for a QUICK cut.
- **Hook:** Open on the payoff already happening (the result on a phone, a finished job), then the thread rips back to where it began.
- **It fails when:** Joins flash or jump, windows swing with no reason, every world is the same dark void, panels look like flat screenshots.

## The world
- The thread is the brightest thing in every frame and the only thing in the brand colour. Everything else supports it.
- Give every act a different colour temperature and scale: close and warm, then wide and cool, then huge at the peak.
- Screens inside the worlds glow and light their surroundings; a screen never sits on black.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Follow the thread at its speed | "this is one journey" | between acts |
| Dive into a screen (portal) | "we go inside the product" | entering an ability |
| Slow orbit around a device | "look at what it holds" | the result of an act |
| Pull back to the widest shot | "it is all connected" | the peak |
| Tiny creep while text is up | "still alive" | every read |

## Three ways to shape it
1. Payoff first: the end result at frame 0, rewind along the thread, travel forward through the acts, arrive at the same frame (a perfect loop).
2. Question first: a single dot of light in a dark room starts moving; each act answers "where is it going?"; the peak shows the whole network.
3. Day in one move: morning, work, evening; the thread carries one task through the day and the light changes with the hour.

## Signature moves
- The portal join: the camera reaches a screen, its picture fills the frame edge to edge, the next world starts on the same picture (measure the join, under 2%).
- The motif hit: the thread touches a device and it lights up exactly on a beat.
- The peak reveal: every device of the film seen at once as lit points joined by the thread.

## Build notes
Plan the thread path first (a spline through the worlds), then the camera as an offset from it. In Blender, one scene per world, joined at portal frames; render EEVEE, Cycles only for the hero device. In HTML, draw the thread on a canvas layer with glow (`shadowBlur`), and put type above it with `data-say`. Put every join on a bar.

## Make it yours
- Safe to change: the colour of the thread, the worlds, the devices, the motif notes.
- Changes its character: cutting between acts instead of joining; two threads.
- Never change: one unbroken move, one thread, the payoff at frame 0.
