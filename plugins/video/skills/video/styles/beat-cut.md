# Beat cut

Family: Social speed. Status: draft. Depth: full.

Loud, fast and in rhythm: every cut lands on the music, and the energy never drops.

- **Use it for:** Young audiences, games, sports, teasers, a launch countdown, an app with many visual moments.
- **Not for:** Calm brands, explainers, anything that needs reading time.
- **Look:** Bold, saturated frames; each shot one clear picture (a screen, an object, a word); hard contrast between shots; a recurring element (colour, logo, object) ties it together.
- **Motion:** Cuts on beats (every beat in the drop, every bar in the build); inside each shot one fast move (punch in, slide, spin); speed ramps into the cut.
- **Type:** One to three words per shot, huge, on screen for at least 1 s across shots (repeat the line if needed).
- **Sound:** A strong track with a clear grid (120 to 150 BPM); a build, a drop, a short silence before the logo.
- **Build with:** The HTML kit; shots as layers switched by `t` on the grid from `sound.py grid`.
- **Hook:** Frame 0 is the strongest picture of the film on the first downbeat.
- **It fails when:** Cuts drift off the beat, shots are too short to read, every shot looks the same, the drop has nothing new to show.

## The world
- A palette of two or three loud colours that switch on cuts.
- Every shot has one subject in the centre; nothing small.
- The recurring element appears in every shot at the same spot so the eye has an anchor.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Punch in 20% on the beat | "hit" | every downbeat |
| Whip pan with real blur into the cut | "next" | the build |
| Speed ramp into a freeze for 0.5 s | "look at this" | the peak |
| Hold still on the logo | "remember this" | the end |

## Three ways to shape it
1. Build and drop: slow shots in the build, beat cuts in the drop, silence, logo.
2. Countdown: 10 to 1, one ability per number.
3. Call and answer: a question shot on the beat, the answer shot on the off beat.

## Signature moves
- The silence before the drop (half a bar with no music).
- A cut on every beat for exactly one bar at the peak.
- The anchor element growing to fill the frame on the last hit.

## Build notes
Get the grid first: `python SK/scripts/sound.py grid --bpm 128 --dur 20`. Put every shot start on a beat time, every text change on a bar. The reading gate still applies: if a word is shorter than 1 s, carry it across two shots.

## Make it yours
- Safe to change: tempo, palette, shot order.
- Changes its character: slow holds, voice-over, few cuts.
- Never change: every cut on the grid, energy that builds.
