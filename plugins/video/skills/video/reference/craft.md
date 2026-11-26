# Craft

The lessons below came from real films that failed and were made again until they worked. Each one is a rule because
breaking it once cost a version.

## 1. Shape of a launch film
| Share of the film | Beat | What it does |
|---|---|---|
| 0 to 8% (first 1 to 2 s) | HOOK | The payoff already happening, bright and full, with big words. It must work with the sound off. |
| 8 to 20% | REWIND or REVEAL | How we got here; the product's name lands. |
| 20 to 45% | ACT 1 | The biggest ability, shown inside the product, in its own world. |
| 45 to 65% | ACT 2 | A second, different wow in a new world (new light, scale and colour). |
| 65 to 82% | THE PEAK | The widest shot: the spine seen whole. Hold it long enough to read (at least 1.5 s). |
| 82 to 100% | END CARD and LOOP | Name, one plain line, where to get it, held at least 2.5 s over a calm background with a slow drift; then the last frame flows into frame 0. |
A 15 s post keeps hook, one act, peak, end card. A 60 s hero film keeps the shape and adds acts, never filler.

A reel made for views (an ad, a post for Reels, Shorts or TikTok) follows the hook rules below, measured on reels
that did well, and is checked with `check.py --reel`:
1. Frame 0 is the payoff: the best settled frame of the film, full-bleed, never black, a logo or a title card.
2. Something moves by 0.3 s. The first big change (a cut, whip or reveal) comes at 0.8 to 1.2 s, never after 2.0 s.
3. 2 to 3 cuts in the first 3 s (shots of 0.5 to 1.2 s). After that 4 to 7 cuts per 10 s, with one held shot of 1.5
   to 2.5 s every 6 to 8 s so the craft can be seen.
4. Hook text from 0.0 s: 3 to 6 whole words (never typed letter by letter), cap height 6 to 9% of the frame height
   (115 to 170 px at 1920), inside the band 14 to 65% from the top. It names the claim; the picture proves it.
5. Sound from 0.00 s, with a hit on the first big change.
6. No logo, handle or URL before 3 s. The brand goes on the last 2 s card and in the caption.
7. 15 to 30 s, with an ending that loops into frame 0.
A calm launch film for a site or a store page may be one slow take; it is not a reel and skips `--reel`.

What fails, from experience:
- A feature tour: beat, caption card, beat, caption card. It reads like a list and nobody finishes it.
- One dark void with floating panels for the whole film. No change of world means no feeling of travel.
- Plain cuts between acts and one flat energy level: no peak, so no memory.
- Doing exactly the words of the request and nothing more. Think like a creative director: what is the one bold form
  idea that IS this product?
- An opening so fast the viewer cannot tell what they see.
- The AI look: purple and violet gradient backdrops, soft glows and neon edges, cute glossy blob or droid mascots,
  floating glass cards. However clean the render, people read it as AI slop and scroll. Take colour and light from the
  product's own brand and from real places and materials instead.
- A film nobody would share. Before any gate, ask: would a stranger stop on this and send it to a friend? If the
  honest answer is "it is fine", the film is not done.

## 2. Joins (the "how did they do that")
- Best first: no join (one camera move); a screen or shape that fills the frame and becomes the next world; a matched
  object; the same place in a new light.
- A portal join: the camera flies into a screen until its picture fills the frame edge to edge; the next shot starts on
  the exact same picture. Measure the two frames: scale the earlier one by about 1.5% (the camera's growth) and the mean
  difference must be under 2% of the range. Over 2%: hide the join inside a full-frame flash of the motif colour (2 to 4
  frames, fully opaque; a partly transparent flash leaves a seam).
- Motion blur needs real sub-frames (the kit's `scene({blur})`, Blender's motion blur). Blending neighbour frames shows
  ghost copies: a fault.
- Every join lands on a bar or beat of the music.

## 3. Worlds and light
- Each act gets its own light, scale and colour: a warm room, a bright glass desk, a deep blue space with lines, a soft
  morning. Plan the worlds from where the product is really used.
- A white or bright world needs depth: haze, soft shadows, parallax. Otherwise it reads as a zoomed screenshot.
- Dark is allowed only as a planned night beat with a lit subject. A stretch of mean luma under 40 for more than 2 s
  fails the gate. `--night` marks a night scene in the story (a storm, a city at night), never a dark product screen:
  a dark UI sits on a lit surround (a desk, a grey or paper ground) at a size where it fills under a quarter of the
  frame with flat dark, and it is never zoomed until its pixels show.
- The subject of every beat fills at least 70% of the frame width. A slab at 20% of the width with tiny content is a fail.
- Real UI or rebuilt UI lives inside the world (on a device, as a lit glass layer), never pasted flat on top.
- Fewer, cleaner materials with real light beat busy procedural detail. Two or three surfaces (a soft gradient, one
  material with a light and a shadow) look premium; noise painted over the whole ground looks like a game map.
- Every texture is made at or above the output size with smooth filtering. Never stretch small noise, never sample with
  nearest neighbour. Particles and sparkles are soft round dots at sub-pixel positions, never square specks. Look at
  the 100% crops from `check.py`: any visible block or square speck is a fail.

## 4. Motion
- The camera follows something, then settles on what must be read. Motion added to reach "energy" is a fault, and so is a
  flat still stretch: in screen and UI stretches keep a motivated move (a slow push, tracking the cursor, a pull back to
  the payoff).
- Slow start, fast middle, long arrival. In a hold keep a tiny creep (0.2 to 1% a frame) so it never looks frozen.
- Measured eases (`kit.js`, from moves in human-made motion design): land with `softLand` (about 12 frames at 30 fps) or
  `snapSettle` (11), leave with `accelExit` (13), big moves `whip` (7), fades `softInOut` (9). Median move about 10 frames.
  Landing decelerates, leaving accelerates, overshoot stays under about 9%, nothing grows from zero (start at 60 to 90%
  scale and fade in).
- Things appear one by one, clicks and typing happen, the product works. That beats any static slide.

## 5. Type and framing (sizes at full resolution)
- 9:16 (1080x1920): hook 110 to 130 px, product name 150 to 170, lines 56 to 64, end card URL 64 to 80. Keep text inside
  x 60 to 940 and y 250 to 1450: the platform's name, caption and buttons cover the rest.
- 16:9 (1920x1080): hook 120 to 130 px, name about 200, lines about 76, URL about 96.
- Minimum: every word at least 14 px tall when the frame is 360 px wide (42 px font at 1080 wide, 75 px at 1920 wide).
- A 9:16 cut of a 16:9 screen (a web page, a dashboard, a desktop app) never shows the whole screen small. Measure in
  the output, not the source: each shot shows one region (a sidebar, one card, the hero headline) that fills the safe
  area from top to bottom, and the words a viewer must read are at least 42 px tall at 1080 wide. A 1:1 crop of a
  desktop screenshot does not pass: its text is desktop size. When the UI exists as HTML (the repo's examples, a local
  build, a saved copy of the page in the film folder; a remote site often refuses frames), put it in the film in an iframe and zoom it with CSS, so text stays sharp at any
  size; a bitmap is never enlarged past 1:1. A before and after uses the same region in the same framing, joined by a
  wipe.
- One text idea at a time near the action. Each line stays fully on screen at least 0.3 s a word plus 0.4 s, and never
  under 1 s. A subtitle never covers the action it talks about. White text on a bright screen needs a scrim.
- One type family for the whole film. Big, short, plain words; no slogans.
- Every word a viewer can see is registered: `data-say` in HTML or `say()` on canvas, UI rows and labels included. Text
  that only flies past is marked `data-pass` (or `pass: true`). Unregistered words skip the reading, size, contrast and
  overlap gates, which is how unreadable UI and text sitting on text get through. In a settled frame text never sits on
  other text.
- Contrast: every line at least 4.5:1 against the background around its letters (`check.py` measures it). Coloured
  words on a busy world need a soft dark shadow or a scrim; muted or pastel words on a mid-tone world fail.

## 6. Sound
- Music made on a beat grid (`sound.py`), so every cut, hit and word lands on it. It builds: quiet, rise, main, break,
  rise, PEAK, calm end. Leave a short silence before the most important hit.
- A motif: the spine has its own sound (three notes, a tone, a click) that returns, an octave up at the peak.
- One sound per visible event, placed from `window.EV`, in the key of the music, never harsh or spiky.
- Voices, when used, sound like a calm, natural person; place them by measured word times. Music 8 dB under a voice
  (10 to 12 under a teaching voice), effects 9 dB under. Check the voice against music plus effects: a riser can bury a
  key word.
- Master: -14 LUFS integrated within 1, true peak under -1.0 dBTP measured after the AAC encode.

## 7. Truth
- Every ability shown is real today and traceable to a source. A beat that is not real is changed to a true one, never
  faked. Real footage goes where viewers would doubt.
- Never: invented numbers, "first", "only", "fastest", user or star counts, prices unless checked today.
- A film for an invented or unreleased product never shows an install command, package name, domain, handle, store
  link or store availability ("Free on iOS and Android", "on the App Store") a stranger could act on or register: anyone could claim the free name and ship malware to people who copy it. Use
  a placeholder that is clearly fake, or no command at all. For a real product, show only commands and links copied
  from its own README or site.
- Unnamed people are they/them. No personal data in any frame (names, emails, home folders, hostnames, notifications,
  tokens). Search the finals by eye and with OCR when one is available.

## 8. Working habits
- Never overwrite a draft: every render gets a new name. The user compares versions.
- Never reuse the user's earlier films as content in a new one unless they ask. Make new worlds.
- Check the first frame of every partial render: a render from the middle can start black.
- A frame tile blends frames: a "ghost" seen only in a sheet is not real until the exact frame shows it.
- Loops over many files go in a Python script, not a long shell loop. Keep 10 GB or more free for frames and encodes.
- A version the user loved is the base of the next one: keep its story and beats, make every second better.
