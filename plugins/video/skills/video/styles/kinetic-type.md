# Kinetic type

Family: Minimal motion. Status: draft. Depth: full.

Only words, and they act out what they say.

- **Use it for:** A strong claim, a manifesto, a launch line, a voice clip, a product with one big idea.
- **Not for:** Showing a UI in detail, a product that needs pictures to make sense.
- **Look:** One heavy typeface, two or three colours, huge words that fill the frame, a colour field that changes per beat.
- **Motion:** Each word has a verb: HEAVY drops and shakes the floor, FAST smears, GROW scales past the frame, SPLIT breaks apart. Every move lands on a beat.
- **Type:** The type is the picture: 200 to 400 px words in 9:16, tight tracking, at most 3 words on screen.
- **Sound:** Strong drums on a clear grid, a hit on every word, a voice reading it if there is one.
- **Build with:** The HTML kit (DOM text with CSS transforms) or a canvas `scene()` with real motion blur on fast words.
- **Hook:** Frame 0 is the boldest word of the film, filling the frame, mid-action.
- **It fails when:** Words just fade in and out, too many words at once, the moves do not match the meanings, text is cut by the safe area.

## The world
- Flat colour fields that switch on the beat; one accent colour for the key word.
- Optional: one object (a ball, a line, the product) that interacts with the words.
- Grain or a soft gradient keeps flat fields from looking like a slide deck.

## Camera grammar
| Move | What it says | Use it when |
|---|---|---|
| Hard cut on the beat | "rhythm" | between words |
| Scale into a letter until it becomes the next field | "one thing becomes the next" | a join |
| Slow zoom out on the full sentence | "now read it whole" | the end |

## Three ways to shape it
1. Read along: the voice line, word by word, each word acts.
2. Build a sentence: words pile up into the final line, then the logo.
3. Argument: a wrong statement breaks apart and rebuilds as the true one.

## Signature moves
- A word that does its meaning (DROP falls off the frame).
- A letter that becomes the next scene through a scale portal.
- The last word holds with a tiny creep so it can be read.

## Build notes
Lay each word as its own element with `data-say` (the gates time it). Words must stay 0.3 s a word plus 0.4 s; fast words still need the full line held at the end. Use `E.crashIn` for hits, `E.accelExit` for exits. For smear, use canvas `scene({blur: 12})` so motion blur is real.

## Make it yours
- Safe to change: the font, the colours, the words.
- Changes its character: adding pictures, a second font.
- Never change: words act their meaning, on the beat.
